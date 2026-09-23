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
  const isCrypto = /\b(crypto|bitcoin|btc|ethereum|eth|token|coin|arbitrum|defi)\b/.test(lower);
  let specialist: string | null = null;
  if (/\b(stock|filing|sec|earnings|10-k)\b/.test(lower)) {
    specialist = extractTickerSymbol(question) ? "ottoaiTradfiData" : "veles";
  } else if (isCrypto && /\b(pool|dex|liquidity)\b/.test(lower)) {
    specialist = "coingecko";
  } else if (isCrypto && /\b(news|happened|today|this week|announced)\b/.test(lower)) {
    specialist = "cryptoslate";
  } else if (isCrypto && /\b(price|market cap)\b/.test(lower)) {
    specialist = null;
  } else if (isCrypto) {
    specialist = "ottoaiCryptoNews";
  }
  return specialist ? [specialist, "superhighway"] : ["superhighway"];
}

export function selectSourcesForDisplay(question: string): SourceMeta[] {
  return selectSourceKeys(question)
    .map((key) => SOURCE_META[key])
    .filter((s): s is SourceMeta => Boolean(s));
}
