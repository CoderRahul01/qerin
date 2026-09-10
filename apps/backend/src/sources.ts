import { withTimeout } from "./withTimeout.js";

// Applies to the free-tier fallback lookups below (RSS/CoinGecko/Wikipedia),
// not the paid x402 sources (those have their own, longer timeout in
// paidFetch.ts) — these are meant to be quick, best-effort context, so a
// tighter budget keeps a slow one from delaying the whole fallback path.
const FALLBACK_FETCH_TIMEOUT_MS = 8_000;

export interface SourceRequest {
  url: string;
  init: RequestInit;
}

export interface SourceDef {
  key: string;
  name: string;
  priceUsd: string;
  buildRequest: (query: string) => Promise<SourceRequest>;
}

// CryptoSlate's paid endpoint unlocks one specific article's full content — it
// has no paid search. We use their free public RSS feed to find the most
// relevant recent article for the question, then pay to unlock its content.
// This keeps the "why did we pay for this" logic explainable, per the same
// philosophy as selectSources.ts.
interface RssItem {
  title: string;
  link: string;
  description: string;
}

function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemBlocks = xml.split("<item>").slice(1);
  for (const block of itemBlocks) {
    const title = block.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? "";
    const link = block.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() ?? "";
    const description = block.match(/<description>([\s\S]*?)<\/description>/)?.[1]?.trim() ?? "";
    if (title && link) items.push({ title, link, description });
  }
  return items;
}

function scoreMatch(query: string, item: RssItem): number {
  const words = query.toLowerCase().match(/\b[a-z0-9]{3,}\b/g) ?? [];
  const haystack = (item.title + " " + item.description).toLowerCase();
  return words.reduce((score, word) => (haystack.includes(word) ? score + 1 : score), 0);
}

async function findCryptoSlateArticle(query: string): Promise<string> {
  const res = await withTimeout(fetch("https://cryptoslate.com/feed/"), FALLBACK_FETCH_TIMEOUT_MS, "CryptoSlate RSS lookup");
  const xml = await res.text();
  const items = parseRss(xml);
  if (items.length === 0) {
    throw new Error("CryptoSlate RSS feed returned no items");
  }
  const scored = items.map((item) => ({ item, score: scoreMatch(query, item) }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0].item.link;
}

export async function findCryptoSlateIntelligence(query: string): Promise<Array<{ title: string; link: string; summary: string }>> {
  try {
    const res = await withTimeout(
      fetch("https://cryptoslate.com/feed/", { headers: { "User-Agent": "QerinResearchAgent/1.0" } }),
      FALLBACK_FETCH_TIMEOUT_MS,
      "CryptoSlate intelligence fallback"
    );
    if (!res.ok) return [];
    const xml = await res.text();
    const items = parseRss(xml);
    if (items.length === 0) return [];
    const scored = items.map((item) => ({ item, score: scoreMatch(query, item) }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 2).map((s) => ({
      title: s.item.title,
      link: s.item.link,
      summary: s.item.description.replace(/<[^>]+>/g, "").trim().slice(0, 300),
    }));
  } catch {
    return [];
  }
}

export async function fetchCoinGeckoIntelligence(query: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await withTimeout(
      fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`, {
        headers: { Accept: "application/json" },
      }),
      FALLBACK_FETCH_TIMEOUT_MS,
      "CoinGecko fallback"
    );
    if (!res.ok) return null;
    const json = (await res.json()) as any;
    if (json && Array.isArray(json.coins) && json.coins.length > 0) {
      return {
        matchedCoins: json.coins.slice(0, 4).map((c: any) => ({
          name: c.name,
          symbol: c.symbol,
          marketCapRank: c.market_cap_rank,
        })),
        categories: json.categories?.slice(0, 2) || [],
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchWebResearch(query: string): Promise<Array<{ title: string; snippet: string }>> {
  try {
    const res = await withTimeout(
      fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&utf8=1`, {
        headers: { "User-Agent": "QerinResearchAgent/1.0" },
      }),
      FALLBACK_FETCH_TIMEOUT_MS,
      "Wikipedia research fallback"
    );
    if (!res.ok) return [];
    const json = (await res.json()) as any;
    const hits = json?.query?.search;
    if (Array.isArray(hits) && hits.length > 0) {
      return hits.slice(0, 3).map((h: any) => ({
        title: h.title,
        snippet: (h.snippet || "").replace(/<[^>]+>/g, "").trim(),
      }));
    }
    return [];
  } catch {
    return [];
  }
}

export const SOURCES: Record<string, SourceDef> = {
  cryptoslate: {
    key: "cryptoslate",
    name: "Web3 Protocol Research",
    priceUsd: "0.01",
    buildRequest: async (query) => {
      const contentUrl = await findCryptoSlateArticle(query);
      return {
        url: "https://library.proofivy.com/cryptoslate",
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content_url: contentUrl }),
        },
      };
    },
  },
  superhighway: {
    key: "superhighway",
    name: "Superhighway Intelligence Node",
    priceUsd: "0.001",
    buildRequest: async (query) => ({
      url: `https://superhighway.walls.sh/search?q=${encodeURIComponent(query)}&limit=5`,
      init: { method: "GET" },
    }),
  },
  veles: {
    key: "veles",
    name: "Financial Intelligence Agent",
    priceUsd: "0.02",
    buildRequest: async (query) => ({
      url: "https://veles-finance-gateway.fly.dev/ask",
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query }),
      },
    }),
  },
  tavily: {
    key: "tavily",
    name: "Autonomous Web Research Node",
    priceUsd: "0.01",
    buildRequest: async (query) => ({
      url: "https://x402.tavily.com/search",
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, search_depth: "advanced", max_results: 5, include_answer: true }),
      },
    }),
  },
  ottoaiCryptoNews: {
    key: "ottoaiCryptoNews",
    name: "Crypto Intelligence Stream",
    priceUsd: "0.001",
    buildRequest: async () => ({
      url: "https://x402.ottoai.services/crypto-news",
      init: { method: "GET" },
    }),
  },
  ottoaiTradfiData: {
    key: "ottoaiTradfiData",
    name: "TradFi Market Feed",
    priceUsd: "0.003",
    buildRequest: async (query) => {
      const symbol = extractTickerSymbol(query);
      const params = symbol ? `?symbol=${encodeURIComponent(symbol)}` : "";
      return {
        url: `https://x402.ottoai.services/tradfi-data${params}`,
        init: { method: "GET" },
      };
    },
  },
  coingecko: {
    key: "coingecko",
    name: "On-Chain Market Search",
    priceUsd: "0.01",
    buildRequest: async (query) => ({
      url: `https://pro-api.coingecko.com/api/v3/x402/onchain/search/pools?query=${encodeURIComponent(query)}&include=base_token`,
      init: { method: "GET" },
    }),
  },
  coinmarketcap: {
    key: "coinmarketcap",
    name: "DEX Liquidity Feed",
    priceUsd: "0.01",
    buildRequest: async (query) => ({
      url: `https://pro-api.coinmarketcap.com/x402/v1/dex/search?q=${encodeURIComponent(query)}`,
      init: { method: "GET" },
    }),
  },
  messari: {
    key: "messari",
    name: "Institutional Signal Node",
    priceUsd: "0.55",
    buildRequest: async (query) => ({
      url: `https://api.messari.io/signal/v1/assets?search=${encodeURIComponent(query)}&limit=10&page=1`,
      init: { method: "GET" },
    }),
  },
};

const STOPWORD_CAPS = new Set(["I", "A", "THE", "AI", "US", "USD", "CEO", "CFO", "IPO", "SEC"]);

// Best-effort ticker extraction: a bare 1-5 letter uppercase token that
// isn't a common capitalized abbreviation. Returns null rather than
// guessing when nothing plausible is found.
export function extractTickerSymbol(query: string): string | null {
  const matches = query.match(/\b[A-Z]{1,5}\b/g) ?? [];
  const candidate = matches.find((m) => !STOPWORD_CAPS.has(m));
  return candidate ?? null;
}
