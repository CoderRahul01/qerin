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
      // Messari's advertised $0.55 route exceeds Qerin's $0.50 per-query
      // hard cap and the $0.15 customer price. Do not select a route the
      // spend guard must reject before it can be paid for honestly.
    }
  }
  if (/\b(news|happened|today|this week|announced)\b/.test(lower)) {
    selected.push("cryptoslate", "superhighway");
  }

  // General-purpose web search fallback. Superhighway advertises an exact
  // Base-USDC x402 challenge, which is the scheme Qerin's payer supports.
  // Tavily's current endpoint instead requires AWS `agent-pay`; selecting it
  // here would guarantee a failed paid request, not a verified result.
  if (selected.length === 0) {
    selected.push("superhighway");
  }

  return [...new Set(selected)].slice(0, 4);
}
