import { extractTickerSymbol } from "./sources.js";

export function selectSources(question: string): string[] {
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

  // One relevant specialist plus a general Base x402 search source. This
  // bounds spend and avoids paying every advertised platform per question.
  return specialist ? [specialist, "superhighway"] : ["superhighway"];
}
