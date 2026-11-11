export interface QerinResearchRequest {
  query: string;
  maxBudgetUsdc?: number;
  persona?: "developer" | "founder" | "trader" | "general";
}

export interface QerinResearchResponse {
  executiveSummary: string;
  sourcesPaid: {
    publisher: string;
    amountPaidUsdc: number;
    transactionHash?: string;
  }[];
  verifiableReceiptHash: string;
  settlementRail: "solana" | "base" | "botchain";
}

/**
 * QerinVerifiedIntelligenceTool
 * Native tool for Solana Agent Kit (SendAI), Eliza, and LangChain agents
 * to procure paywalled and verified real-time intelligence via x402 micropayments.
 */
export class QerinVerifiedIntelligenceTool {
  name = "qerin_fetch_verified_intelligence";
  description =
    "Procures verified, real-time intelligence from paywalled data sources using Solana x402 micro-settlements. Returns verified facts, citations, and on-chain receipt hashes.";

  private endpoint: string;
  private apiKey?: string;

  constructor(config?: { endpoint?: string; apiKey?: string }) {
    this.endpoint = config?.endpoint || "https://qerin.vercel.app/api/answer";
    this.apiKey = config?.apiKey;
  }

  async execute(params: QerinResearchRequest): Promise<QerinResearchResponse> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        question: params.query,
        budgetLimit: params.maxBudgetUsdc || 0.08,
        persona: params.persona || "developer",
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Qerin intelligence request failed with status: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return {
      executiveSummary: data.executiveSummary || data.answer || "",
      sourcesPaid: data.sourcesPaid || [],
      verifiableReceiptHash: data.receiptHash || data.transactionHash || "",
      settlementRail: "solana",
    };
  }
}
