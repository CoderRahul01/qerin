import { x402Client, x402HTTPClient, wrapFetchWithPayment } from "@x402/fetch";
import { registerPayerScheme, type AgentPayer } from "./agentPayer.js";

// A paid request includes an initial 402, a signature, settlement and a
// second response. Three seconds routinely expired during settlement.
const SOURCE_TIMEOUT_MS = 20_000;
const MAX_SOURCE_USDC = 0.07;

const EVM_TX_REGEX = /^0x[a-fA-F0-9]{64}$/;
// Solana transaction signatures are base58-encoded 64-byte ed25519 signatures.
const SOLANA_TX_REGEX = /^[1-9A-HJ-NP-Za-km-z]{64,96}$/;

export interface PaidResult {
  content: unknown;
  sourceName: string;
  amountPaid: string;
  txHash: string | null;
  /** CAIP-2 network the source settled on (x402 results only). */
  network?: string;
  timestamp: string;
  /** True only when the x402 facilitator returned an on-chain settlement tx. */
  settlement: "x402" | "enrichment" | "telemetry";
}

type QuotedOption = { scheme: string; network: string; asset?: string; amount?: string; maxAmountRequired?: string };

function quotedAmount(option: QuotedOption): string {
  return option.amount ?? option.maxAmountRequired ?? "";
}

// Built per call: the signer is the paying user's own wallet on the rail the
// agent chose for this question, so no client is ever shared between users.
function getPaymentClient(expectedPriceUsd: string, payer: AgentPayer) {
  const maxAtomic = BigInt(Math.round(Math.min(Number(expectedPriceUsd), MAX_SOURCE_USDC) * 1_000_000));
  const { rail } = payer;
  let quotedAtomic: string | null = null;
  const client = new x402Client((_version, accepts) => {
    const allowed = accepts.filter((option) => {
      const quoted = option as unknown as QuotedOption;
      const amount = quotedAmount(quoted);
      const networkMatches = quoted.network === rail.caip2 || (quoted.network === "base" && rail.caip2 === "eip155:8453");
      return option.scheme === "exact"
        && networkMatches
        && quoted.asset?.toLowerCase() === rail.usdc.toLowerCase()
        && /^\d+$/.test(amount) && BigInt(amount) > 0n && BigInt(amount) <= maxAtomic;
    });
    if (allowed.length === 0) throw new Error(`Source does not accept USDC on ${rail.name} within its quoted price`);
    const selected = allowed.sort((a, b) => {
      const price = (item: typeof a) => BigInt(quotedAmount(item as unknown as QuotedOption) || "0");
      return price(a) < price(b) ? -1 : 1;
    })[0];
    quotedAtomic = quotedAmount(selected as unknown as QuotedOption) || null;
    return selected;
  });
  registerPayerScheme(client, payer);
  return { fetchWithPayment: wrapFetchWithPayment(fetch, client), httpClient: new x402HTTPClient(client), getQuotedAtomic: () => quotedAtomic };
}

/** USDC has 6 decimals on every supported rail. */
function formatUsdcAtomicAmount(atomic: string): string {
  return (Number(atomic) / 1_000_000).toString();
}

export async function paySource(
  sourceName: string,
  url: string,
  expectedPriceUsd: string,
  payer: AgentPayer,
  init: RequestInit = { method: "GET" }
): Promise<PaidResult> {
  const { fetchWithPayment, httpClient, getQuotedAtomic } = getPaymentClient(expectedPriceUsd, payer);
  const response = await fetchWithPayment(url, { ...init, signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS) });

  if (!response.ok) {
    throw new Error(`${sourceName} responded ${response.status}`);
  }

  // A 2xx response alone is not proof of a paid resource. Only a settlement
  // header carrying an on-chain transaction is eligible for Qerin's paid
  // ledger, receipt registry, or customer-facing settlement UI.
  let txHash: string | null = null;
  let amountPaid = "0";
  const txPattern = payer.rail.family === "evm" ? EVM_TX_REGEX : SOLANA_TX_REGEX;
  try {
    const settleResponse = httpClient.getPaymentSettleResponse((name) => response.headers.get(name));
    txHash = settleResponse.transaction ?? null;
    if (!settleResponse.success || !txHash || !txPattern.test(txHash)) {
      throw new Error("missing successful settlement transaction");
    }
    if (settleResponse.network !== payer.rail.caip2) {
      throw new Error("settlement network does not match the paying wallet");
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
    network: payer.rail.caip2,
    timestamp: new Date().toISOString(),
    settlement: "x402",
  };
}
