import { x402Client, x402HTTPClient, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactSvmScheme } from "@x402/svm/exact/client";
import { getQerinSolanaSigner } from "./solana/wallet.js";
import { getSolanaNetwork } from "./solana/network.js";
import type { PaidResult } from "./paidFetch.js";

// Mirrors paidFetch.ts's shape exactly, but for the Solana/SVM x402 scheme.
// Kept as a separate module rather than a branch inside paidFetch.ts: the
// two chains use different signers (ed25519 vs secp256k1), different
// settlement-tx formats (base58 signature vs 0x-prefixed hash), and
// paidFetch.ts settles real money on Base mainnet today — this file must not
// risk that path while the Solana leg is still devnet-only and unproven.
const SOURCE_TIMEOUT_MS = 20_000;
const MAX_SOURCE_USDC = 0.07;

// Solana transaction signatures are base58-encoded 64-byte ed25519
// signatures — never `0x`-prefixed, and a different length than an address.
const SOLANA_SIGNATURE_REGEX = /^[1-9A-HJ-NP-Za-km-z]{64,96}$/;

async function getSolanaPaymentClient(expectedPriceUsd: string) {
  const maxAtomic = BigInt(Math.round(Math.min(Number(expectedPriceUsd), MAX_SOURCE_USDC) * 1_000_000));
  const network = getSolanaNetwork();
  let quotedAtomic: string | null = null;
  const client = new x402Client((_version, accepts) => {
    const allowed = accepts.filter((option) => {
      const quoted = option as unknown as { network: string; asset?: string; amount?: string; maxAmountRequired?: string };
      const amount = quoted.amount ?? quoted.maxAmountRequired ?? "";
      return option.scheme === "exact"
        && quoted.network === network.caip2
        && quoted.asset?.toLowerCase() === network.usdc.toLowerCase()
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
  const signer = await getQerinSolanaSigner();
  registerExactSvmScheme(client, { signer, networks: [network.caip2] });
  return { fetchWithPayment: wrapFetchWithPayment(fetch, client), httpClient: new x402HTTPClient(client), getQuotedAtomic: () => quotedAtomic };
}

/** USDC has 6 decimals on Solana too. */
function formatUsdcAtomicAmount(atomic: string): string {
  return (Number(atomic) / 1_000_000).toString();
}

export async function paySourceOnSolana(
  sourceName: string,
  url: string,
  expectedPriceUsd: string,
  init: RequestInit = { method: "GET" }
): Promise<PaidResult> {
  const { fetchWithPayment, httpClient, getQuotedAtomic } = await getSolanaPaymentClient(expectedPriceUsd);
  const response = await fetchWithPayment(url, { ...init, signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS) });

  if (!response.ok) {
    throw new Error(`${sourceName} responded ${response.status}`);
  }

  let txHash: string | null = null;
  let amountPaid = "0";
  try {
    const settleResponse = httpClient.getPaymentSettleResponse((name) => response.headers.get(name));
    txHash = settleResponse.transaction ?? null;
    if (!settleResponse.success || !txHash || !SOLANA_SIGNATURE_REGEX.test(txHash)) {
      throw new Error("missing successful settlement transaction");
    }
    if (settleResponse.network !== getSolanaNetwork().caip2) {
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
