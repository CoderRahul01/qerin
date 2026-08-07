import { getCdpAuthHeaders, getCdpCredentials } from "./cdpAuth.js";
import { getQerinAccount } from "./wallet.js";
import { recordDeposit } from "./accounts.js";

// Coinbase Onramp integration: lets a consumer buy USDC by card/bank,
// delivered straight to Qerin's existing wallet, attributed back to
// their Qerin account balance via `partnerUserRef`.
//
// Verified working end-to-end against a real CDP Production Secret API
// Key (Sandbox keys 401 against this host — easy to mix up in the CDP
// portal, which defaults new keys to Sandbox).

const ONRAMP_HOST = "api.developer.coinbase.com";
const SESSION_TOKEN_PATH = "/onramp/v1/token";
const ONRAMP_BUY_URL = "https://pay.coinbase.com/buy/select-asset";

interface OnrampTransaction {
  status?: string;
  transaction_id?: string;
  tx_hash?: string;
  purchase_amount?: { value?: string; currency?: string };
  completed_at?: string | null;
}

/**
 * Creates a single-use Onramp session token and returns the hosted URL
 * the user should be redirected to. `amountUsd` pre-fills the fiat
 * amount; the user can still change it on Coinbase's hosted page.
 */
export async function createOnrampSession(accountId: string, amountUsd: number): Promise<string> {
  const credentials = getCdpCredentials();
  const destinationAddress = getQerinAccount().address;

  const headers = await getCdpAuthHeaders(credentials, ONRAMP_HOST, SESSION_TOKEN_PATH, "POST");
  const res = await fetch(`https://${ONRAMP_HOST}${SESSION_TOKEN_PATH}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      addresses: [{ address: destinationAddress, blockchains: ["base"] }],
      assets: ["USDC"],
    }),
  });

  if (!res.ok) {
    throw new Error(`Onramp session token request failed (${res.status}): ${await res.text()}`);
  }

  const body = (await res.json()) as { token?: string };
  if (!body.token) {
    throw new Error("Onramp session token response did not include a token");
  }

  const url = new URL(ONRAMP_BUY_URL);
  url.searchParams.set("sessionToken", body.token);
  url.searchParams.set("partnerUserRef", accountId);
  url.searchParams.set("defaultAsset", "USDC");
  url.searchParams.set("defaultNetwork", "base");
  url.searchParams.set("presetFiatAmount", amountUsd.toFixed(2));
  return url.toString();
}

/**
 * Polls CDP for this account's Onramp transaction history and credits
 * any newly-completed purchase to the account balance. Safe to call
 * repeatedly — recordDeposit is idempotent per transaction id.
 */
export async function syncDeposits(accountId: string): Promise<void> {
  const credentials = getCdpCredentials();
  const path = `/onramp/v1/buy/user/${encodeURIComponent(accountId)}/transactions`;

  const headers = await getCdpAuthHeaders(credentials, ONRAMP_HOST, path, "GET");
  const res = await fetch(`https://${ONRAMP_HOST}${path}`, { headers });

  if (!res.ok) {
    // Don't fail the caller's request over a sync hiccup — the next
    // balance check will just try again.
    console.error(`Onramp transaction sync failed (${res.status}): ${await res.text()}`);
    return;
  }

  const body = (await res.json()) as { transactions?: OnrampTransaction[] };
  const transactions = body.transactions ?? [];

  for (const tx of transactions) {
    const isCompleted = tx.status === "COMPLETED" || tx.status === "SUCCESS" || Boolean(tx.completed_at);
    const txId = tx.transaction_id ?? tx.tx_hash;
    const amount = Number(tx.purchase_amount?.value ?? NaN);

    if (!isCompleted || !txId || !Number.isFinite(amount) || amount <= 0) continue;

    await recordDeposit(accountId, txId, amount);
  }
}
