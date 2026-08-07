// Mirrors apps/backend/src/selectSources.ts + sources.ts pricing exactly, so
// the "paying" screen's pre-response animation shows the sources Qerin is
// actually about to pay rather than a fixed placeholder list. The backend
// remains the source of truth — this only drives cosmetic choreography while
// the real request is in flight (see 06-frontend-integration.md); the
// receipt shown afterward always comes from the real response.
export interface SourceMeta {
  key: string;
  name: string;
  priceUsd: number;
}

const SOURCE_META: Record<string, SourceMeta> = {
  cryptoslate: { key: "cryptoslate", name: "CryptoSlate", priceUsd: 0.01 },
  superhighway: { key: "superhighway", name: "Superhighway", priceUsd: 0.001 },
  veles: { key: "veles", name: "Veles Finance Agent", priceUsd: 0.02 },
};

function selectSourceKeys(question: string): string[] {
  const lower = question.toLowerCase();
  const selected: string[] = [];

  if (/\b(stock|filing|sec|earnings|10-k)\b/.test(lower)) {
    selected.push("veles");
  }
  if (/\b(news|happened|today|this week|announced)\b/.test(lower)) {
    selected.push("cryptoslate", "superhighway");
  }

  if (selected.length === 0) {
    selected.push("superhighway");
  }

  return [...new Set(selected)].slice(0, 3);
}

export function selectSourcesForDisplay(question: string): SourceMeta[] {
  return selectSourceKeys(question).map((key) => SOURCE_META[key]);
}
