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

export interface AnswerData {
  question: string;
  answer: string;
  receipt: ReceiptItem[];
  totalPaid: string;
  balance?: number;
}
