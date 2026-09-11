export type Screen = "ask" | "paying" | "answer" | "developer";

export type PayStatus = "waiting" | "paying" | "paid";

export interface PaySource {
  name: string;
  amount: number;
  hash: string;
  status: PayStatus;
}

export interface ReceiptItem {
  source: string;
  amountPaid: string;
  txHash: string | null;
  basescanUrl: string | null;
  timestamp: string;
  content: unknown;
}

export interface PersonaInsights {
  developer?: string;
  founder?: string;
  contentWriter?: string;
  trader?: string;
}

export interface SourceCitation {
  name: string;
  citation: string;
}

// Mirrors ProgressEvent in apps/backend/src/orchestrator.ts — real pipeline
// events streamed as SSE from /v1/answer, not decorative client-side guesses.
export type AnswerProgressEvent =
  | { type: "sources_selected"; sources: { name: string; priceUsd: string }[] }
  | { type: "source_settled"; name: string; success: boolean; amountPaid?: string }
  | { type: "synthesizing" };

export interface AnswerData {
  question: string;
  topic?: string;
  summary?: string;
  answer: string;
  personaInsights?: PersonaInsights;
  sourceCitations?: SourceCitation[];
  receipt: ReceiptItem[];
  registryTxHash?: string;
  registryContract?: string;
  registryExplorerUrl?: string;
  totalPaid: string;
  balance?: number;
  network?: string;
  chainId?: number;
}
