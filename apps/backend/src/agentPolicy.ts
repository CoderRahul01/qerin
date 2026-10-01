import { normalizeAccountId } from "./accounts.js";
import { getDb, FieldValue } from "./db.js";

// The spend policy each user sets for their own Qerin agent. The agent reads
// it before every question and refuses to spend outside it — the user's
// wallet is the treasury, and this is the mandate they give the agent over
// it. Only the owner can change it, with a fresh wallet signature
// (ownerIntents.ts); reads and enforcement live here.
//
// Everything is stored on the single accounts/{id} document (policy, today's
// spend, any fee still owed, recent agent activity) so enforcing a question
// costs one Firestore read — the free Spark tier allows 50k/day.

export const QERIN_SERVICE_FEE_USD = 0.08;

export const POLICY_BOUNDS = {
  perQueryUsd: { min: 0.09, max: 5 },
  dailyUsd: { min: 0.09, max: 100 },
} as const;

export interface AgentPolicy {
  perQueryUsd: number;
  dailyUsd: number;
  paused: boolean;
}

export const DEFAULT_POLICY: AgentPolicy = { perQueryUsd: 0.25, dailyUsd: 2, paused: false };

export type ActivityKind = "source" | "fee" | "withdrawal";

export interface AgentActivity {
  kind: ActivityKind;
  label: string;
  amountUsd: number;
  rail: string;
  txHash: string | null;
  explorerUrl: string | null;
  at: string;
}

const MAX_ACTIVITY = 25;

export interface AgentState {
  policy: AgentPolicy;
  spentTodayUsd: number;
  feeOwedUsd: number;
  activity: AgentActivity[];
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Rounds to whole cents, rejecting anything that isn't a finite number. */
function toCents(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

export function parsePolicy(raw: unknown): AgentPolicy {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const perQuery = toCents(data.perQueryUsd);
  const daily = toCents(data.dailyUsd);
  return {
    perQueryUsd: perQuery === null ? DEFAULT_POLICY.perQueryUsd : clamp(perQuery, POLICY_BOUNDS.perQueryUsd.min, POLICY_BOUNDS.perQueryUsd.max),
    dailyUsd: daily === null ? DEFAULT_POLICY.dailyUsd : clamp(daily, POLICY_BOUNDS.dailyUsd.min, POLICY_BOUNDS.dailyUsd.max),
    paused: data.paused === true,
  };
}

/** Validates an owner-requested policy; returns an error message or the policy. */
export function validatePolicyInput(input: unknown): AgentPolicy | string {
  const data = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const perQuery = toCents(data.perQueryUsd);
  const daily = toCents(data.dailyUsd);
  const { perQueryUsd: pq, dailyUsd: dl } = POLICY_BOUNDS;
  if (perQuery === null || perQuery < pq.min || perQuery > pq.max) {
    return `Per-question limit must be between $${pq.min.toFixed(2)} and $${pq.max.toFixed(2)}`;
  }
  if (daily === null || daily < dl.min || daily > dl.max) {
    return `Daily limit must be between $${dl.min.toFixed(2)} and $${dl.max.toFixed(2)}`;
  }
  if (daily < perQuery) return "Daily limit can't be lower than the per-question limit";
  if (typeof data.paused !== "boolean") return "paused must be true or false";
  return { perQueryUsd: perQuery, dailyUsd: daily, paused: data.paused };
}

function readState(data: Record<string, unknown> | undefined): AgentState {
  const spend = (data?.agentSpend ?? {}) as Record<string, unknown>;
  const activity = Array.isArray(data?.agentActivity) ? (data!.agentActivity as AgentActivity[]) : [];
  return {
    policy: parsePolicy(data?.agentPolicy),
    spentTodayUsd: spend.day === todayKey() ? Number(spend.usd ?? 0) || 0 : 0,
    feeOwedUsd: Number(data?.feeOwedUsd ?? 0) || 0,
    activity,
  };
}

export async function getAgentState(accountId: string): Promise<AgentState> {
  const doc = await getDb().collection("accounts").doc(normalizeAccountId(accountId)).get();
  return readState(doc.exists ? doc.data() : undefined);
}

export async function saveAgentPolicy(accountId: string, policy: AgentPolicy): Promise<void> {
  await getDb().collection("accounts").doc(normalizeAccountId(accountId)).set(
    { agentPolicy: { ...policy, updatedAt: FieldValue.serverTimestamp() } },
    { merge: true }
  );
}

export type PolicyDecision = { ok: true } | { ok: false; code: "agent_paused" | "per_query_limit" | "daily_limit"; message: string };

/**
 * Whether the agent may spend `costUsd` (sources + fee + any fee owed) on one
 * question right now. Pure, so the same rule is unit-tested and enforced.
 */
export function checkPolicy(state: AgentState, costUsd: number): PolicyDecision {
  const { policy } = state;
  if (policy.paused) {
    return { ok: false, code: "agent_paused", message: "Your Qerin agent is paused. Resume it in your Qerin wallet to run research." };
  }
  if (costUsd > policy.perQueryUsd + 1e-9) {
    return {
      ok: false,
      code: "per_query_limit",
      message: `This question needs up to $${costUsd.toFixed(3)}, above your $${policy.perQueryUsd.toFixed(2)} per-question limit. Raise it in your Qerin wallet.`,
    };
  }
  if (state.spentTodayUsd + costUsd > policy.dailyUsd + 1e-9) {
    return {
      ok: false,
      code: "daily_limit",
      message: `Your agent has spent $${state.spentTodayUsd.toFixed(2)} of its $${policy.dailyUsd.toFixed(2)} daily limit. Raise it in your Qerin wallet or wait until 00:00 UTC.`,
    };
  }
  return { ok: true };
}

/**
 * Records what the agent actually spent: bumps today's total, appends to the
 * activity feed (newest first, capped), and adjusts any fee still owed.
 */
export async function recordAgentSpend(
  accountId: string,
  entries: AgentActivity[],
  feeOwedDeltaUsd = 0
): Promise<void> {
  if (entries.length === 0 && feeOwedDeltaUsd === 0) return;
  const db = getDb();
  const ref = db.collection("accounts").doc(normalizeAccountId(accountId));
  await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const state = readState(doc.exists ? doc.data() : undefined);
    // Withdrawals return the owner's own money; they don't count against the
    // agent's daily research mandate.
    const spent = entries.filter((e) => e.kind !== "withdrawal").reduce((sum, e) => sum + e.amountUsd, 0);
    tx.set(ref, {
      agentSpend: { day: todayKey(), usd: Math.round((state.spentTodayUsd + spent) * 1e6) / 1e6 },
      agentActivity: [...entries, ...state.activity].slice(0, MAX_ACTIVITY),
      feeOwedUsd: Math.max(0, Math.round((state.feeOwedUsd + feeOwedDeltaUsd) * 1e6) / 1e6),
    }, { merge: true });
  });
}
