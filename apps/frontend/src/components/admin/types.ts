// Mirrors apps/backend/src/adminAnalytics.ts. Keep both in sync.

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


