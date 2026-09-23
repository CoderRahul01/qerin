import { isAddress } from "viem";
import { getDb } from "./db.js";
import { ANSWER_PRICE_USD } from "./spendGuard.js";

// Private founder dashboard. Unlike analytics.ts (public, aggregate only)
// this reads every business collection and returns revenue, cost, funnel
// and per-account data, so it is only reachable behind the internal secret
// and the frontend's admin key (see /api/admin/analytics).

const PASS_CREDIT_USD = 1.5;
const DAY_MS = 24 * 60 * 60 * 1000;
const CACHE_MS = 60 * 1000;

export interface DailyPoint {
  date: string;
  newAccounts: number;
  queries: number;
  earnedUsd: number;
  cashInUsd: number;
  costUsd: number;
}

export interface FunnelStep {
  step: string;
  count: number;
}

export interface Insight {
  level: "action" | "watch" | "good";
  title: string;
  detail: string;
}

export interface TopAccount {
  account: string;
  queries: number;
  earnedUsd: number;
  depositedUsd: number;
  balanceUsd: number;
  lastActive: string | null;
}

export interface AdminAnalytics {
  generatedAt: string;
  windowDays: number;
  users: {
    totalAccounts: number;
    walletAccounts: number;
    newInWindow: number;
    newPrevWindow: number;
    passClaims: number;
    depositors: number;
    researchers: number;
    activeInWindow: number;
    activePrevWindow: number;
    repeatResearchers: number;
    waitlistSignups: number;
    apiKeysIssued: number;
  };
  funnel: FunnelStep[];
  revenue: {
    cashInUsd: number;
    cashInWindowUsd: number;
    cashInPrevWindowUsd: number;
    cashInByNetwork: Record<string, number>;
    earnedUsd: number;
    earnedWindowUsd: number;
    earnedPrevWindowUsd: number;
    earnedAppUsd: number;
    earnedApiUsd: number;
    promoCreditsUsd: number;
    outstandingBalanceUsd: number;
  };
  costs: {
    sourceSpendUsd: number;
    sourceSpendWindowUsd: number;
    llmCostUsd: number;
    llmCostWindowUsd: number;
    llmTrackedQueries: number;
    llmTokens: number;
    modelMix: Array<{ model: string; queries: number; costUsd: number }>;
  };
  unitEconomics: {
    queries: number;
    queriesWindow: number;
    queriesPrevWindow: number;
    avgRevenuePerQueryUsd: number;
    avgSourceCostPerQueryUsd: number;
    avgLlmCostPerQueryUsd: number;
    grossMarginUsd: number;
    grossMarginPct: number | null;
  };
  daily: DailyPoint[];
  topAccounts: TopAccount[];
  insights: Insight[];
}

interface AccountStats {
  queries: number;
  earnedUsd: number;
  depositedUsd: number;
  lastActive: Date | null;
}

const cache = new Map<number, { expiresAt: number; value: AdminAnalytics }>();

function asDate(value: unknown): Date | null {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value : null;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function round(value: number, digits = 4): number {
  return Number(value.toFixed(digits));
}

function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function usd(value: number): string {
  return `$${value.toFixed(value > 0 && value < 0.01 ? 4 : 2)}`;
}

function plural(n: number, word: string, many = `${word}s`): string {
  return `${n} ${n === 1 ? word : many}`;
}

function maskAccount(id: string): string {
  return isAddress(id) ? `${id.slice(0, 6)}…${id.slice(-4)}` : `anon-${id.slice(0, 8)}`;
}

function statsFor(map: Map<string, AccountStats>, id: string): AccountStats {
  let stats = map.get(id);
  if (!stats) {
    stats = { queries: 0, earnedUsd: 0, depositedUsd: 0, lastActive: null };
    map.set(id, stats);
  }
  return stats;
}

// Records written before revenue tracking carry only debitedUsd (app) or
// nothing (developer API, which is priced the same as the app).
function revenueOf(record: Record<string, unknown>): number {
  if (typeof record.revenueUsd === "number") return record.revenueUsd;
  if (typeof record.debitedUsd === "number") return record.debitedUsd;
  return ANSWER_PRICE_USD;
}

export async function getAdminAnalytics(windowDays = 30): Promise<AdminAnalytics> {
  const days = Math.min(Math.max(Math.round(windowDays), 1), 365);
  const cached = cache.get(days);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const db = getDb();
  const [accountsSnap, depositsSnap, spendSnap, waitlistSnap, apiKeysSnap] = await Promise.all([
    db.collection("accounts").get(),
    db.collection("usedDeposits").get(),
    db.collection("spendLog").get(),
    db.collection("waitlist").get(),
    db.collection("apiKeys").get(),
  ]);

  const now = new Date();
  const windowStart = new Date(now.getTime() - days * DAY_MS);
  const prevStart = new Date(now.getTime() - 2 * days * DAY_MS);
  const inWindow = (d: Date | null) => d !== null && d >= windowStart;
  const inPrev = (d: Date | null) => d !== null && d >= prevStart && d < windowStart;

  const daily = new Map<string, DailyPoint>();
  for (let i = days - 1; i >= 0; i--) {
    const date = dayKey(new Date(now.getTime() - i * DAY_MS));
    daily.set(date, { date, newAccounts: 0, queries: 0, earnedUsd: 0, cashInUsd: 0, costUsd: 0 });
  }
  const bump = (d: Date | null, fn: (p: DailyPoint) => void) => {
    if (!d) return;
    const point = daily.get(dayKey(d));
    if (point) fn(point);
  };

  // ── Accounts ─────────────────────────────────────────────────────────
  const users = {
    totalAccounts: 0,
    walletAccounts: 0,
    newInWindow: 0,
    newPrevWindow: 0,
    passClaims: 0,
    depositors: 0,
    researchers: 0,
    activeInWindow: 0,
    activePrevWindow: 0,
    repeatResearchers: 0,
    waitlistSignups: waitlistSnap.size,
    apiKeysIssued: apiKeysSnap.size,
  };
  const passClaimers = new Set<string>();
  const walletIds = new Set<string>();
  const balances = new Map<string, number>();
  let outstandingBalanceUsd = 0;

  for (const doc of accountsSnap.docs) {
    const data = doc.data() ?? {};
    const createdAt = asDate(data.createdAt);
    users.totalAccounts += 1;
    if (isAddress(doc.id)) {
      users.walletAccounts += 1;
      walletIds.add(doc.id);
    }
    if (data.passClaimed) passClaimers.add(doc.id);
    if (inWindow(createdAt)) users.newInWindow += 1;
    if (inPrev(createdAt)) users.newPrevWindow += 1;
    bump(createdAt, (p) => (p.newAccounts += 1));
    const balance = Number(data.balance ?? 0);
    balances.set(doc.id, balance);
    outstandingBalanceUsd += balance;
  }
  users.passClaims = passClaimers.size;

  // ── Deposits (real money in) ─────────────────────────────────────────
  const perAccount = new Map<string, AccountStats>();
  const depositors = new Set<string>();
  const cashInByNetwork: Record<string, number> = {};
  let cashInUsd = 0;
  let cashInWindowUsd = 0;
  let cashInPrevWindowUsd = 0;

  for (const doc of depositsSnap.docs) {
    const data = doc.data() ?? {};
    const amount = Number(data.amount ?? 0);
    const createdAt = asDate(data.createdAt);
    const network = doc.id.includes(":") ? doc.id.split(":")[0] : "unknown";
    cashInUsd += amount;
    cashInByNetwork[network] = (cashInByNetwork[network] ?? 0) + amount;
    if (inWindow(createdAt)) cashInWindowUsd += amount;
    if (inPrev(createdAt)) cashInPrevWindowUsd += amount;
    bump(createdAt, (p) => (p.cashInUsd += amount));
    if (typeof data.accountId === "string") {
      depositors.add(data.accountId);
      statsFor(perAccount, data.accountId).depositedUsd += amount;
    }
  }
  users.depositors = depositors.size;

  // ── Paid deliveries (earned revenue and costs) ───────────────────────
  let queries = 0;
  let queriesWindow = 0;
  let queriesPrevWindow = 0;
  let earnedUsd = 0;
  let earnedWindowUsd = 0;
  let earnedPrevWindowUsd = 0;
  let earnedAppUsd = 0;
  let earnedApiUsd = 0;
  let sourceSpendUsd = 0;
  let sourceSpendWindowUsd = 0;
  let llmCostUsd = 0;
  let llmCostWindowUsd = 0;
  let llmTrackedQueries = 0;
  let llmTokens = 0;
  const modelMix = new Map<string, { queries: number; costUsd: number }>();
  const activeWindow = new Set<string>();
  const activePrev = new Set<string>();

  for (const doc of spendSnap.docs) {
    const data = doc.data() ?? {};
    const createdAt = asDate(data.createdAt);
    const revenue = revenueOf(data);
    const sourceCost = Number(data.sourceCostUsd ?? 0);
    const llmCost = typeof data.llmCostUsd === "number" ? data.llmCostUsd : 0;
    const userId = typeof data.userId === "string" && data.userId ? data.userId : null;

    queries += 1;
    earnedUsd += revenue;
    sourceSpendUsd += sourceCost;
    llmCostUsd += llmCost;
    if (userId) earnedAppUsd += revenue;
    else earnedApiUsd += revenue;

    if (data.llmProvider !== undefined) {
      llmTrackedQueries += 1;
      llmTokens += Number(data.llmPromptTokens ?? 0) + Number(data.llmCompletionTokens ?? 0);
      const model = typeof data.llmModel === "string" ? data.llmModel : "template fallback";
      const mix = modelMix.get(model) ?? { queries: 0, costUsd: 0 };
      mix.queries += 1;
      mix.costUsd += llmCost;
      modelMix.set(model, mix);
    }

    if (inWindow(createdAt)) {
      queriesWindow += 1;
      earnedWindowUsd += revenue;
      sourceSpendWindowUsd += sourceCost;
      llmCostWindowUsd += llmCost;
      if (userId) activeWindow.add(userId);
    }
    if (inPrev(createdAt)) {
      queriesPrevWindow += 1;
      earnedPrevWindowUsd += revenue;
      if (userId) activePrev.add(userId);
    }
    bump(createdAt, (p) => {
      p.queries += 1;
      p.earnedUsd += revenue;
      p.costUsd += sourceCost + llmCost;
    });

    if (userId) {
      const stats = statsFor(perAccount, userId);
      stats.queries += 1;
      stats.earnedUsd += revenue;
      if (createdAt && (!stats.lastActive || createdAt > stats.lastActive)) stats.lastActive = createdAt;
    }
  }

  const researcherIds = [...perAccount.entries()].filter(([, s]) => s.queries > 0).map(([id]) => id);
  users.researchers = researcherIds.length;
  users.repeatResearchers = researcherIds.filter((id) => perAccount.get(id)!.queries >= 2).length;
  users.activeInWindow = activeWindow.size;
  users.activePrevWindow = activePrev.size;

  // ── Funnel (wallet-connected users only, so each step is a subset) ───
  const walletResearchers = researcherIds.filter((id) => walletIds.has(id));
  const funnel: FunnelStep[] = [
    { step: "Wallet connected", count: walletIds.size },
    { step: "Claimed free pass", count: [...passClaimers].filter((id) => walletIds.has(id)).length },
    { step: "Ran a paid query", count: walletResearchers.length },
    { step: "Ran 2+ queries", count: walletResearchers.filter((id) => perAccount.get(id)!.queries >= 2).length },
    { step: "Topped up real money", count: [...depositors].filter((id) => walletIds.has(id)).length },
  ];

  const promoCreditsUsd = passClaimers.size * PASS_CREDIT_USD;
  const totalCost = sourceSpendUsd + llmCostUsd;
  const grossMarginUsd = earnedUsd - totalCost;

  const topAccounts: TopAccount[] = [...perAccount.entries()]
    .sort((a, b) => b[1].earnedUsd + b[1].depositedUsd - (a[1].earnedUsd + a[1].depositedUsd))
    .slice(0, 10)
    .map(([id, s]) => ({
      account: maskAccount(id),
      queries: s.queries,
      earnedUsd: round(s.earnedUsd),
      depositedUsd: round(s.depositedUsd),
      balanceUsd: round(balances.get(id) ?? 0),
      lastActive: s.lastActive ? s.lastActive.toISOString() : null,
    }));

  const value: AdminAnalytics = {
    generatedAt: now.toISOString(),
    windowDays: days,
    users,
    funnel,
    revenue: {
      cashInUsd: round(cashInUsd),
      cashInWindowUsd: round(cashInWindowUsd),
      cashInPrevWindowUsd: round(cashInPrevWindowUsd),
      cashInByNetwork: Object.fromEntries(Object.entries(cashInByNetwork).map(([k, v]) => [k, round(v)])),
      earnedUsd: round(earnedUsd),
      earnedWindowUsd: round(earnedWindowUsd),
      earnedPrevWindowUsd: round(earnedPrevWindowUsd),
      earnedAppUsd: round(earnedAppUsd),
      earnedApiUsd: round(earnedApiUsd),
      promoCreditsUsd: round(promoCreditsUsd),
      outstandingBalanceUsd: round(outstandingBalanceUsd),
    },
    costs: {
      sourceSpendUsd: round(sourceSpendUsd),
      sourceSpendWindowUsd: round(sourceSpendWindowUsd),
      llmCostUsd: round(llmCostUsd, 6),
      llmCostWindowUsd: round(llmCostWindowUsd, 6),
      llmTrackedQueries,
      llmTokens,
      modelMix: [...modelMix.entries()]
        .map(([model, m]) => ({ model, queries: m.queries, costUsd: round(m.costUsd, 6) }))
        .sort((a, b) => b.queries - a.queries),
    },
    unitEconomics: {
      queries,
      queriesWindow,
      queriesPrevWindow,
      avgRevenuePerQueryUsd: queries ? round(earnedUsd / queries) : 0,
      avgSourceCostPerQueryUsd: queries ? round(sourceSpendUsd / queries) : 0,
      avgLlmCostPerQueryUsd: llmTrackedQueries ? round(llmCostUsd / llmTrackedQueries, 6) : 0,
      grossMarginUsd: round(grossMarginUsd),
      grossMarginPct: earnedUsd > 0 ? Math.round((grossMarginUsd / earnedUsd) * 100) : null,
    },
    daily: [...daily.values()].map((p) => ({
      ...p,
      earnedUsd: round(p.earnedUsd),
      cashInUsd: round(p.cashInUsd),
      costUsd: round(p.costUsd),
    })),
    topAccounts,
    insights: [],
  };
  const passUsers = [...passClaimers];
  value.insights = buildInsights(value, perAccount, balances, {
    passUsers: passUsers.length,
    passUsersQueried: passUsers.filter((id) => (perAccount.get(id)?.queries ?? 0) > 0).length,
    passUsersPaid: passUsers.filter((id) => depositors.has(id)).length,
  });

  cache.set(days, { value, expiresAt: Date.now() + CACHE_MS });
  return value;
}

/**
 * Rule-based growth guidance. Each rule only fires when the data behind it
 * exists, and every message states the numbers it is based on.
 */
function buildInsights(
  a: AdminAnalytics,
  perAccount: Map<string, AccountStats>,
  balances: Map<string, number>,
  pass: { passUsers: number; passUsersQueried: number; passUsersPaid: number }
): Insight[] {
  const out: Insight[] = [];
  const [wallets, passed, queried, repeated] = a.funnel.map((s) => s.count);

  if (a.unitEconomics.queries === 0) {
    out.push({
      level: "action",
      title: "No paid queries yet",
      detail: `${a.users.totalAccounts} accounts exist but none completed a paid query. Get the first 10 users through one query personally and watch where they get stuck.`,
    });
    return out;
  }

  if (wallets > 0 && passed < wallets * 0.5) {
    out.push({
      level: "action",
      title: "Most connected wallets never claim the free pass",
      detail: `${passed} of ${wallets} wallets (${pct(passed, wallets)}%) claimed the $1.50 pass. Show the claim button right after wallet connect.`,
    });
  }

  const unusedPasses = pass.passUsers - pass.passUsersQueried;
  if (unusedPasses > 0) {
    out.push({
      level: unusedPasses >= pass.passUsers * 0.3 ? "action" : "watch",
      title: "Free pass claimed but not used",
      detail: `${plural(unusedPasses, "user")} of ${pass.passUsers} claimed the pass and never asked a question. Add suggested starter questions on the empty chat screen.`,
    });
  }

  if (queried > 0) {
    const repeatRate = pct(repeated, queried);
    out.push(
      repeatRate < 30
        ? {
            level: "action",
            title: "Low repeat usage",
            detail: `Only ${repeatRate}% of researchers ran 2+ queries. Retention is the main growth lever: follow up on first answers and add saved topics or alerts.`,
          }
        : {
            level: "good",
            title: "Users come back",
            detail: `${repeatRate}% of researchers ran 2+ queries. Double down on the use cases these users ask about.`,
          }
    );
  }

  if (pass.passUsers > 0) {
    const conversion = pct(pass.passUsersPaid, pass.passUsers);
    out.push({
      level: conversion < 10 ? "action" : conversion < 25 ? "watch" : "good",
      title: "Free pass to paid conversion",
      detail: `${pass.passUsersPaid} of ${pass.passUsers} pass users (${conversion}%) topped up real money. ${conversion < 10 ? "Prompt a top-up when the pass balance runs out and make the first top-up amount small." : "Keep the pass; it converts."}`,
    });
  }

  const margin = a.unitEconomics.grossMarginPct;
  if (margin !== null) {
    const sourceShare = pct(a.unitEconomics.avgSourceCostPerQueryUsd, a.unitEconomics.avgRevenuePerQueryUsd);
    out.push({
      level: margin < 0 ? "action" : margin < 30 ? "watch" : "good",
      title: `Gross margin ${margin}%`,
      detail: `Each query earns ${usd(a.unitEconomics.avgRevenuePerQueryUsd)} and costs ${usd(a.unitEconomics.avgSourceCostPerQueryUsd)} in sources (${sourceShare}% of price) plus ${usd(a.unitEconomics.avgLlmCostPerQueryUsd)} in AI.${margin < 30 ? " Route more questions to cheaper sources or raise the price for multi-source answers." : ""}`,
    });
  }

  if (a.costs.llmTrackedQueries < a.unitEconomics.queries) {
    out.push({
      level: "watch",
      title: "AI cost tracking is partial",
      detail: `${plural(a.unitEconomics.queries - a.costs.llmTrackedQueries, "older query", "older queries")} were recorded before AI cost tracking was added, so total AI spend is understated.`,
    });
  }

  const prevActive = a.users.activePrevWindow;
  if (prevActive > 0) {
    const change = pct(a.users.activeInWindow - prevActive, prevActive);
    out.push({
      level: change < 0 ? "action" : "good",
      title: `Active researchers ${change >= 0 ? "up" : "down"} ${Math.abs(change)}%`,
      detail: `${a.users.activeInWindow} active in the last ${a.windowDays} days vs ${prevActive} in the ${a.windowDays} days before.`,
    });
  }

  const earned = [...perAccount.values()].map((s) => s.earnedUsd).sort((x, y) => y - x);
  const totalAppEarned = earned.reduce((s, v) => s + v, 0);
  if (earned.length >= 3 && totalAppEarned > 0) {
    const topShare = pct(earned[0], totalAppEarned);
    if (topShare >= 40) {
      out.push({
        level: "watch",
        title: "Revenue depends on one user",
        detail: `Your top account generates ${topShare}% of app revenue. Talk to them, learn their use case, and find more users like them.`,
      });
    }
  }

  const idleHolders = [...balances.entries()].filter(
    ([id, balance]) => balance >= ANSWER_PRICE_USD && (perAccount.get(id)?.queries ?? 0) === 0
  );
  if (idleHolders.length > 0) {
    const idleUsd = idleHolders.reduce((s, [, b]) => s + b, 0);
    out.push({
      level: "watch",
      title: "Unused credit sitting in accounts",
      detail: `${plural(idleHolders.length, "account")} ${idleHolders.length === 1 ? "holds" : "hold"} ${usd(idleUsd)} and never ran a query. A reminder with one example question can turn this into usage.`,
    });
  }

  if (a.users.waitlistSignups > a.users.walletAccounts) {
    out.push({
      level: "action",
      title: "Waitlist is bigger than your user base",
      detail: `${a.users.waitlistSignups} waitlist emails vs ${a.users.walletAccounts} wallet users. Email the waitlist with a direct app link and the free pass.`,
    });
  }

  if (a.revenue.earnedApiUsd === 0 && a.users.apiKeysIssued > 0) {
    out.push({
      level: "watch",
      title: "Developer API has keys but no paid calls",
      detail: `${a.users.apiKeysIssued} API keys issued, $0 earned from the x402 API. Publish a copy-paste example and reach out to key holders.`,
    });
  }

  return out;
}
