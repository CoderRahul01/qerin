import { x402Client, x402HTTPClient, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { getQerinAccount } from "./wallet.js";
import { getNetwork } from "./networks.js";

// A paid request includes an initial 402, a signature, settlement and a
// second response. Three seconds routinely expired during settlement.
const SOURCE_TIMEOUT_MS = 20_000;
const MAX_SOURCE_USDC = 0.07;

export interface PaidResult {
  content: unknown;
  sourceName: string;
  amountPaid: string;
  txHash: string | null;
  timestamp: string;
  /** True only when the x402 facilitator returned an on-chain settlement tx. */
  settlement: "x402" | "enrichment" | "telemetry";
}

// Lazily built on first paySource() call — the wallet and network config it
// depends on both read process.env, which is only populated once a request
// is being handled on Workers (see wallet.ts).
function getPaymentClient(expectedPriceUsd: string) {
  const maxAtomic = BigInt(Math.round(Math.min(Number(expectedPriceUsd), MAX_SOURCE_USDC) * 1_000_000));
  const network = getNetwork();
  let quotedAtomic: string | null = null;
  const client = new x402Client((_version, accepts) => {
    const allowed = accepts.filter((option) => {
      const quoted = option as unknown as { network: string; asset?: string; amount?: string; maxAmountRequired?: string };
      const amount = quoted.amount ?? quoted.maxAmountRequired ?? "";
      return option.scheme === "exact"
        && (quoted.network === network.caip2 || (quoted.network === "base" && network.chainId === 8453))
        && quoted.asset?.toLowerCase() === network.usdc?.toLowerCase()
        && /^\d+$/.test(amount) && BigInt(amount) > 0n && BigInt(amount) <= maxAtomic;
    });
    if (allowed.length === 0) throw new Error("Source payment is unavailable or exceeds its quoted price");
    const selected = allowed.sort((a, b) => {
      const price = (item: typeof a) => BigInt((item as unknown as { amount?: string; maxAmountRequired?: string }).amount ?? (item as unknown as { maxAmountRequired?: string }).maxAmountRequired ?? "0");
      return price(a) < price(b) ? -1 : 1;
    })[0];
    quotedAtomic = (selected as unknown as { amount?: string; maxAmountRequired?: string }).amount
      ?? (selected as unknown as { maxAmountRequired?: string }).maxAmountRequired ?? null;
    return selected;
  });
  registerExactEvmScheme(client, { signer: getQerinAccount(), networks: [network.caip2] });
  return { fetchWithPayment: wrapFetchWithPayment(fetch, client), httpClient: new x402HTTPClient(client), getQuotedAtomic: () => quotedAtomic };
}

/**
 * USDC has 6 decimals on Base. SettleResponse.amount (when present) is in atomic units.
 */
function formatUsdcAtomicAmount(atomic: string): string {
  const value = Number(atomic) / 1_000_000;
  return value.toString();
}

export async function paySource(
  sourceName: string,
  url: string,
  expectedPriceUsd: string,
  init: RequestInit = { method: "GET" }
): Promise<PaidResult> {
  const { fetchWithPayment, httpClient, getQuotedAtomic } = getPaymentClient(expectedPriceUsd);
  const response = await fetchWithPayment(url, { ...init, signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS) });

  if (!response.ok) {
    throw new Error(`${sourceName} responded ${response.status}`);
  }

  // A 2xx response alone is not proof of a paid resource. Only a settlement
  // header carrying an on-chain transaction is eligible for Qerin's paid
  // ledger, receipt registry, or customer-facing settlement UI.
  let txHash: string | null = null;
  let amountPaid = "0";
  try {
    const settleResponse = httpClient.getPaymentSettleResponse((name) =>
      response.headers.get(name)
    );
    txHash = settleResponse.transaction ?? null;
    if (!settleResponse.success || !txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      throw new Error("missing successful settlement transaction");
    }
    if (settleResponse.network !== getNetwork().caip2) {
      throw new Error("settlement network does not match the source payer");
    }
    amountPaid = settleResponse.amount
      ? formatUsdcAtomicAmount(settleResponse.amount)
      : formatUsdcAtomicAmount(getQuotedAtomic() || "0");
  } catch {
    throw new Error(`${sourceName} returned no verifiable x402 settlement`);
  }

  const body = await response.text();
  let content: unknown;
  try {
    content = JSON.parse(body);
  } catch {
    content = body;
  }

  return {
    content,
    sourceName,
    amountPaid,
    txHash,
    timestamp: new Date().toISOString(),
    settlement: "x402",
  };
}
