import { getDb, FieldValue, type DocumentReference } from "./db.js";

const MAX_PER_QUESTION_USDC = 0.5;

// Global ceiling across every account combined — the hard stop on Qerin's
// own wallet's daily exposure.
const MAX_DAILY_USDC = 5.0;

// Per-account ceiling, enforced in addition to the global one — without
// this, a single account (malicious or just very active) could consume the
// entire shared daily budget alone and lock out every other user.
const MAX_ACCOUNT_DAILY_USDC = 1.0;

// $0.15 = $0.07 sources + $0.08 fee, matching DeveloperScreen.tsx's pricing
// breakdown. Both paywalls charge exactly this.
export const QERIN_SERVICE_FEE_USD = 0.08;

// Flat price charged per answer.
export const ANSWER_PRICE_USD = 0.15;

// Hard cap on question length, enforced at the route layer (index.ts) before
// any source is paid — bounds both the LLM synthesis cost and the size of
// what gets hashed into an on-chain receipt.
export const MAX_QUESTION_LENGTH = 500;

// ── Daily spend accounting ──────────────────────────────────────────────
//
// Collection: spendCounters/{YYYY-MM-DD}
//   fields: { totalUsd, updatedAt }
// Subcollection: spendCounters/{YYYY-MM-DD}/accounts/{accountId}
//   fields: { totalUsd, updatedAt }
//
// Audit trail (not read on the hot path): spendLog/{autoId}
//   fields: { sourceCostUsd, sourceCount, userId, debitedUsd, createdAt }
//
// The two counter docs above exist so checkSpendLimit costs exactly one (or
// two) Firestore reads no matter how many answers have already run today.
// The previous design queried every spendLog row created since midnight on
// every single request — on Firestore's free 50,000-reads/day quota, that
// scan alone would exhaust the day's entire read budget after a few hundred
// answers, before counting a single other read the app needs. A running
// counter, updated transactionally alongside each write, keeps the read
// cost flat as volume grows — the actual definition of "scales on the free
// tier" rather than "works during a demo."

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD, UTC
}

async function readCounter(accountId?: string | null): Promise<{ global: number; account: number }> {
  const db = getDb();
  const day = todayKey();

  const globalRef = db.collection("spendCounters").doc(day);
  const globalDoc = await globalRef.get();
  const global = globalDoc.exists ? Number(globalDoc.data()!.totalUsd ?? 0) : 0;

  if (!accountId) return { global, account: 0 };

  const acctRef = globalRef.collection("accounts").doc(accountId);
  const acctDoc = await acctRef.get();
  const account = acctDoc.exists ? Number(acctDoc.data()!.totalUsd ?? 0) : 0;

  return { global, account };
}

export async function checkSpendLimit(estimatedCost: number, accountId?: string | null): Promise<boolean> {
  if (estimatedCost > MAX_PER_QUESTION_USDC) return false;

  const { global, account } = await readCounter(accountId);

  if (global + estimatedCost > MAX_DAILY_USDC) return false;
  if (accountId && account + estimatedCost > MAX_ACCOUNT_DAILY_USDC) return false;

  return true;
}

async function bumpCounter(ref: DocumentReference, amount: number): Promise<void> {
  const db = getDb();
  await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const current = doc.exists ? Number(doc.data()!.totalUsd ?? 0) : 0;
    tx.set(ref, { totalUsd: current + amount, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
}

export async function recordSpend(
  sourceCostUsd: number,
  sourceCount: number,
  accountId: string | null = null,
  debitedUsd: number | null = null
): Promise<void> {
  const db = getDb();
  const day = todayKey();
  const globalRef = db.collection("spendCounters").doc(day);

  await Promise.all([
    db.collection("spendLog").add({
      sourceCostUsd,
      sourceCount,
      userId: accountId,
      debitedUsd,
      createdAt: FieldValue.serverTimestamp(),
    }),
    bumpCounter(globalRef, sourceCostUsd),
    accountId ? bumpCounter(globalRef.collection("accounts").doc(accountId), sourceCostUsd) : Promise.resolve(),
  ]);
}
