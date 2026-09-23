import { getDb } from "./db.js";
import { isAddress } from "viem";

export interface GrowthWindow {
  paidResearchQueries: number;
  agentSourceSpendUsd: number;
  activeResearchAccounts: number;
}

export interface PublicAnalytics {
  allTime: GrowthWindow;
  last30Days: GrowthWindow;
  generatedAt: string;
  methodology: string;
}

export interface PrivateAnalytics {
  totalAccounts: number;
  walletUsers: number;
  fundedUsers: number;
  researchUsers: number;
  paidQueries: number;
  topups: { base: number; botChain: number; totalUsd: number };
  users: Array<{ accountId: string; balanceUsd: number; topups: number; topupUsd: number; paidQueries: number; baseTopups: number; botChainTopups: number }>;
  generatedAt: string;
}

/** Owner-only view. Never route this through a public Next.js API endpoint. */
export async function getPrivateAnalytics(): Promise<PrivateAnalytics> {
  const db = getDb();
  const [accounts, deposits, spends] = await Promise.all([
    db.collection("accounts").get(),
    db.collection("usedDeposits").get(),
    db.collection("spendLog").get(),
  ]);
  const users = new Map<string, PrivateAnalytics["users"][number]>();
  for (const doc of accounts.docs) {
    users.set(doc.id, {
      accountId: doc.id,
      balanceUsd: Number(doc.data()?.balance ?? 0),
      topups: 0, topupUsd: 0, paidQueries: 0, baseTopups: 0, botChainTopups: 0,
    });
  }
  let base = 0;
  let botChain = 0;
  let totalUsd = 0;
  for (const doc of deposits.docs) {
    const data = doc.data() ?? {};
    const user = users.get(String(data.accountId));
    if (!user) continue;
    const amount = Number(data.amount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    user.topups += 1;
    user.topupUsd += amount;
    totalUsd += amount;
    if (doc.id.startsWith("8453:")) { user.baseTopups += 1; base += 1; }
    if (doc.id.startsWith("677:")) { user.botChainTopups += 1; botChain += 1; }
  }
  for (const doc of spends.docs) {
    const data = doc.data() ?? {};
    const user = users.get(String(data.userId));
    if (user && data.delivered !== false) user.paidQueries += 1;
  }
  const rows = [...users.values()].map((user) => ({
    ...user,
    balanceUsd: Number(user.balanceUsd.toFixed(3)),
    topupUsd: Number(user.topupUsd.toFixed(3)),
  }));
  return {
    totalAccounts: rows.length,
    walletUsers: rows.filter((user) => isAddress(user.accountId)).length,
    fundedUsers: rows.filter((user) => user.topups > 0).length,
    researchUsers: rows.filter((user) => user.paidQueries > 0).length,
    paidQueries: rows.reduce((sum, user) => sum + user.paidQueries, 0),
    topups: { base, botChain, totalUsd: Number(totalUsd.toFixed(3)) },
    users: rows.sort((a, b) => b.paidQueries - a.paidQueries),
    generatedAt: new Date().toISOString(),
  };
}

const ANALYTICS_CACHE_MS = 5 * 60 * 1000;
let cachedAnalytics: { expiresAt: number; value: PublicAnalytics } | null = null;

function emptyWindow(): GrowthWindow {
  return { paidResearchQueries: 0, agentSourceSpendUsd: 0, activeResearchAccounts: 0 };
}

function recordWindow(
  window: GrowthWindow,
  accounts: Set<string>,
  record: Record<string, unknown>
): void {
  window.paidResearchQueries += 1;
  window.agentSourceSpendUsd += Number(record.sourceCostUsd ?? 0);
  if (typeof record.userId === "string" && record.userId.length > 0) {
    accounts.add(record.userId);
  }
}

/**
 * Aggregate only completed paid-source deliveries recorded by recordSpend().
 * This intentionally excludes failed requests, free enrichment, wallet
 * balances, questions, and any individual identity from the public response.
 */
export async function getPublicAnalytics(): Promise<PublicAnalytics> {
  if (cachedAnalytics && cachedAnalytics.expiresAt > Date.now()) {
    return cachedAnalytics.value;
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const allTime = emptyWindow();
  const last30Days = emptyWindow();
  const allTimeAccounts = new Set<string>();
  const recentAccounts = new Set<string>();

  const snapshot = await getDb().collection("spendLog").get();
  for (const doc of snapshot.docs) {
    const record = doc.data() ?? {};
    if (record.delivered === false) continue;
    recordWindow(allTime, allTimeAccounts, record);

    const rawCreatedAt = record.createdAt;
    const createdAt = rawCreatedAt instanceof Date
      ? rawCreatedAt
      : rawCreatedAt && typeof rawCreatedAt === "object" && "toDate" in rawCreatedAt && typeof rawCreatedAt.toDate === "function"
        ? rawCreatedAt.toDate() as Date
        : null;
    if (createdAt && createdAt >= thirtyDaysAgo) {
      recordWindow(last30Days, recentAccounts, record);
    }
  }

  allTime.activeResearchAccounts = allTimeAccounts.size;
  last30Days.activeResearchAccounts = recentAccounts.size;
  allTime.agentSourceSpendUsd = Number(allTime.agentSourceSpendUsd.toFixed(6));
  last30Days.agentSourceSpendUsd = Number(last30Days.agentSourceSpendUsd.toFixed(6));

  const value: PublicAnalytics = {
    allTime,
    last30Days,
    generatedAt: now.toISOString(),
    methodology:
      "Counts completed paid-source deliveries recorded by Qerin. Failed requests and public enrichment are excluded; account counts are aggregated without exposing addresses or questions.",
  };
  cachedAnalytics = { value, expiresAt: Date.now() + ANALYTICS_CACHE_MS };
  return value;
}
