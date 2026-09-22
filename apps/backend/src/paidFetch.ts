import { x402Client, x402HTTPClient, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { getQerinAccount } from "./wallet.js";
import { getNetwork } from "./networks.js";
import { withTimeout } from "./withTimeout.js";

// Per-source timeout. Paid x402 sources that require on-chain payment
// negotiation have their own upstream latency; 3s is enough for a healthy
// source, and fast enough to fall through to free sources without a long stall.
// (Previously 5s — that 2s saved per failing source adds up when 3-4 sources
// are selected and all fail.)
const SOURCE_TIMEOUT_MS = 3_000;

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
let paymentClient: { fetchWithPayment: typeof fetch; httpClient: InstanceType<typeof x402HTTPClient> } | null = null;

function getPaymentClient() {
  if (!paymentClient) {
    const client = new x402Client();
    registerExactEvmScheme(client, { signer: getQerinAccount(), networks: [getNetwork().caip2] });
    paymentClient = {
      fetchWithPayment: wrapFetchWithPayment(fetch, client),
      httpClient: new x402HTTPClient(client),
    };
  }
  return paymentClient;
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
  const { fetchWithPayment, httpClient } = getPaymentClient();
  const response = await withTimeout(fetchWithPayment(url, init), SOURCE_TIMEOUT_MS, sourceName);

  if (!response.ok) {
    throw new Error(`${sourceName} responded ${response.status}`);
  }

  const content = await response.json();

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
    if (!txHash) throw new Error("missing settlement transaction");
    amountPaid = settleResponse.amount
      ? formatUsdcAtomicAmount(settleResponse.amount)
      : expectedPriceUsd;
  } catch {
    throw new Error(`${sourceName} returned no verifiable x402 settlement`);
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
