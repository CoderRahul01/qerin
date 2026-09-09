import { x402Client, x402HTTPClient, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { getQerinAccount } from "./wallet.js";
import { getNetwork } from "./networks.js";
import { withTimeout } from "./withTimeout.js";

// A single source (its own server, or the x402 facilitator settling
// payment) hanging with no response used to hang the entire /v1/answer
// request indefinitely — gatherSources() awaits every source via
// Promise.allSettled, which waits for every promise to *settle*, not just
// the fast ones. One dead source meant no response ever reached the user,
// with no error and no timeout screen — just an infinite "Paying..." state.
const SOURCE_TIMEOUT_MS = 15_000;

export interface PaidResult {
  content: unknown;
  sourceName: string;
  amountPaid: string;
  txHash: string | null;
  timestamp: string;
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

  // SettleResponse.amount is only populated for schemes like `upto` where the
  // settled amount can differ from the authorized max — for `exact`, fall back
  // to the price we already know we agreed to pay this source. If the resource
  // turned out not to require payment at all, no settle header will be present.
  let txHash: string | null = null;
  let amountPaid = expectedPriceUsd;
  try {
    const settleResponse = httpClient.getPaymentSettleResponse((name) =>
      response.headers.get(name)
    );
    txHash = settleResponse.transaction ?? null;
    if (settleResponse.amount) {
      amountPaid = formatUsdcAtomicAmount(settleResponse.amount);
    }
  } catch {
    // No payment was actually required/settled for this request.
    amountPaid = "0";
  }

  return {
    content,
    sourceName,
    amountPaid,
    txHash,
    timestamp: new Date().toISOString(),
  };
}
