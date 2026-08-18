export type SourceId = "cryptoslate" | "superhighway" | "veles" | "coingecko" | "coinmarketcap" | "messari";

export const SOURCES: { id: SourceId; label: string }[] = [
  { id: "cryptoslate", label: "CryptoSlate" },
  { id: "superhighway", label: "Superhighway" },
  { id: "veles", label: "Veles Finance" },
  { id: "coingecko", label: "CoinGecko" },
  { id: "coinmarketcap", label: "CoinMarketCap" },
  { id: "messari", label: "Messari" },
];

// Simplified, original geometric marks (not trademark reproductions) that
// give each source a distinct, recognizable silhouette in the trusted-
// sources strip instead of bare text.
export function SourceIcon({ id, size = 18 }: { id: SourceId; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 20 20", "aria-hidden": true as const };

  switch (id) {
    case "cryptoslate":
      return (
        <svg {...common}>
          <path
            d="M13 4.5c-3 0-5.5 2.5-5.5 5.5s2.5 5.5 5.5 5.5"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="13" cy="10" r="1.6" fill="currentColor" />
        </svg>
      );
    case "superhighway":
      return (
        <svg {...common}>
          <path
            d="M3 14 L8 6 M8 14 L13 6 M13 14 L17 7.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "veles":
      return (
        <svg {...common}>
          <path d="M3 5h14l-7 11z" fill="currentColor" />
        </svg>
      );
    case "coingecko":
      return (
        <svg {...common}>
          <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" fill="none" />
          <circle cx="12.4" cy="7.6" r="1.1" fill="currentColor" />
          <path d="M6.5 12c1 1.4 2.3 2 3.7 2s2.9-.8 3.6-2.2" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </svg>
      );
    case "coinmarketcap":
      return (
        <svg {...common}>
          <rect x="3.5" y="11" width="3" height="5.5" rx="0.8" fill="currentColor" />
          <rect x="8.5" y="7" width="3" height="9.5" rx="0.8" fill="currentColor" />
          <rect x="13.5" y="3.5" width="3" height="13" rx="0.8" fill="currentColor" />
        </svg>
      );
    case "messari":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="14" height="14" rx="4" stroke="currentColor" strokeWidth="1.6" fill="none" />
          <path d="M6.5 13.5v-7l3.5 4.2 3.5-4.2v7" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}
