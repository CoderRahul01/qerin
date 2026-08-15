import { extractTickerSymbol } from "./sources.js";

export function selectSources(question: string): string[] {
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

  // General-purpose web search fallback: always included when nothing more
  // specific matched, and a reasonable single-source answer when it's the
  // only thing selected — Tavily's payers/volume on the x402 Bazaar (see
  // sources.ts) made it the strongest generic pick over Superhighway alone.
  if (selected.length === 0) {
    selected.push("tavily");
  }

  return [...new Set(selected)].slice(0, 4);
}
