import { getDb } from "./db.js";

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
    recordWindow(allTime, allTimeAccounts, record);

    const createdAt = record.createdAt;
    if (createdAt instanceof Date && createdAt >= thirtyDaysAgo) {
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
