// Mirrors apps/backend/src/selectSources.ts + sources.ts exactly, so the
// "paying" screen's pre-response animation names the sources Qerin is
// actually about to pay rather than a stale placeholder list. The backend
// remains the source of truth — this only drives cosmetic choreography while
// the real request is in flight (see 06-frontend-integration.md); the
// receipt shown afterward always comes from the real response.
export interface SourceMeta {
  key: string;
  name: string;
  priceUsd: number;
}

const SOURCE_META: Record<string, SourceMeta> = {
  cryptoslate: { key: "cryptoslate", name: "Web3 Protocol Research", priceUsd: 0.01 },
  superhighway: { key: "superhighway", name: "Superhighway Intelligence Node", priceUsd: 0.001 },
  veles: { key: "veles", name: "Financial Intelligence Agent", priceUsd: 0.02 },
  tavily: { key: "tavily", name: "Autonomous Web Research Node", priceUsd: 0.01 },
  ottoaiCryptoNews: { key: "ottoaiCryptoNews", name: "Crypto Intelligence Stream", priceUsd: 0.001 },
  ottoaiTradfiData: { key: "ottoaiTradfiData", name: "TradFi Market Feed", priceUsd: 0.003 },
  coingecko: { key: "coingecko", name: "On-Chain Market Search", priceUsd: 0.01 },
  coinmarketcap: { key: "coinmarketcap", name: "DEX Liquidity Feed", priceUsd: 0.01 },
  messari: { key: "messari", name: "Institutional Signal Node", priceUsd: 0.55 },
};

const STOPWORD_CAPS = new Set(["I", "A", "THE", "AI", "US", "USD", "CEO", "CFO", "IPO", "SEC"]);

function extractTickerSymbol(question: string): string | null {
  const matches = question.match(/\b[A-Z]{1,5}\b/g) ?? [];
  const candidate = matches.find((m) => !STOPWORD_CAPS.has(m));
  return candidate ?? null;
}

function selectSourceKeys(question: string): string[] {
  const lower = question.toLowerCase();
  const selected: string[] = [];

  if (/\b(stock|filing|sec|earnings|10-k)\b/.test(lower)) {
    selected.push("veles");
    if (extractTickerSymbol(question)) {
      selected.push("ottoaiTradfiData");
    }
  }
  if (/\b(crypto|bitcoin|ethereum|token|coin)\b/.test(lower)) {
    selected.push("ottoaiCryptoNews");
    if (/\b(price|market cap|volume|pool|dex|liquidity)\b/.test(lower)) {
      selected.push("coingecko", "coinmarketcap");
    }
    if (/\b(sentiment|trending|momentum|mindshare|research)\b/.test(lower)) {
      selected.push("messari");
    }
  }
  if (/\b(news|happened|today|this week|announced)\b/.test(lower)) {
    selected.push("cryptoslate", "superhighway");
  }

  // General-purpose fallback for anything that doesn't match a specific
  // category above (e.g. a question with nothing crypto/finance-specific
  // in it) — matches the backend's fallback exactly. This used to fall
  // back to Superhighway here even though the backend had already moved
  // to Tavily as the general-purpose source, which is why the "paying"
  // screen kept saying "Superhighway" for questions the backend was
  // actually routing somewhere else entirely.
  if (selected.length === 0) {
    selected.push("tavily");
  }

  return [...new Set(selected)].slice(0, 4);
}

export function selectSourcesForDisplay(question: string): SourceMeta[] {
  return selectSourceKeys(question)
    .map((key) => SOURCE_META[key])
    .filter((s): s is SourceMeta => Boolean(s));
}
