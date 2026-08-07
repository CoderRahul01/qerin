import { paySource, type PaidResult } from "./paidFetch.js";
import { SOURCES } from "./sources.js";

export function estimateCost(sourceKeys: string[]): number {
  return sourceKeys.reduce((sum, key) => {
    const source = SOURCES[key];
    return source ? sum + parseFloat(source.priceUsd) : sum;
  }, 0);
}

export async function gatherSources(
  question: string,
  sourceKeys: string[]
): Promise<PaidResult[]> {
  const selected = sourceKeys.map((key) => SOURCES[key]).filter((s): s is NonNullable<typeof s> => Boolean(s));

  const results = await Promise.allSettled(
    selected.map(async (source) => {
      const request = await source.buildRequest(question);
      return paySource(source.name, request.url, source.priceUsd, request.init);
    })
  );

  // Failed sources are dropped, not surfaced as errors — see 08-security-and-limits.md
  return results
    .filter((r): r is PromiseFulfilledResult<PaidResult> => r.status === "fulfilled")
    .map((r) => r.value);
}
