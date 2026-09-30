export type Timeframe = "24H" | "7D" | "30D" | "ALL";

export type NavTab = "overview" | "queries" | "chains" | "failures" | "wallets";

export interface ProtocolMetrics {
  totalRevenueUsd: number;
  revenue24hUsd: number;
  revenueChange24hPct: number;
  totalQueries: number;
  queries24h: number;
  successfulListings: number;
  walletsConnected: number;
  totalUsers: number;
  activeUsers: number;
  agentSourceSpendUsd: number;
  grossMarginPct: number;
  avgLatencyMs: number;
  systemSuccessRatePct: number;
}

export interface ChainStat {
  name: string;
  chainId: number;
  symbol: string;
  status: "active" | "standby";
  totalTransactions: number;
  txSharePct: number;
  volumeUsd: number;
  avgGasCostUsd: number;
  avgBlockTimeSec: number;
  contractAddress: string;
  explorerUrl: string;
  color: string;
  isMaxChain?: boolean;
}

export interface SearchQueryItem {
  id: string;
  query: string;
  topic: string;
  category: "AI & Infra" | "DeFi" | "Cross-Chain" | "Micropayments" | "EVM Gas";
  sources: string[];
  settlementStatus: "x402 Verified" | "Delivered";
  amountUsd: number;
  chain: "BOT Chain" | "Base" | "Solana";
  txHash?: string;
  timestamp: string;
  latencyMs: number;
  userAddress: string;
}

export interface FailurePoint {
  id: string;
  category: "Spend Guard" | "Publisher Timeout" | "Wallet Rejection" | "RPC Throttling" | "Gas Variance";
  description: string;
  occurrences: number;
  impact: "low" | "medium" | "high";
  status: "mitigated" | "monitoring" | "resolved";
  mitigation: string;
}

export interface WalletUserItem {
  address: string;
  label?: string;
  type: "Operator" | "Active Research" | "Funded Account" | "New Visitor";
  queriesCount: number;
  totalSpentUsd: number;
  primaryChain: string;
  firstSeen: string;
  lastActive: string;
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      isMetaMask?: boolean;
    };
  }
}
