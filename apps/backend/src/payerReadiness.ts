import { getNetwork } from "./networks.js";
import { getQerinAccount } from "./wallet.js";

// The consumer balance is an account ledger. Real source payments leave the
// separate Qerin payer wallet on Base, so check that wallet before debiting.
const MIN_READY_USDC_ATOMIC = 70_000n;
let cached: { until: number; ready: boolean } | null = null;

export async function paidSourcesReady(): Promise<boolean> {
  if (cached && cached.until > Date.now()) return cached.ready;
  const base = getNetwork("mainnet");
  const address = getQerinAccount().address.slice(2).toLowerCase().padStart(64, "0");
  let ready = false;
  try {
    const response = await fetch(base.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "eth_call",
        params: [{ to: base.usdc, data: `0x70a08231${address}` }, "latest"],
      }),
      signal: AbortSignal.timeout(5_000),
    });
    const data = await response.json() as { result?: string };
    ready = response.ok && typeof data.result === "string" && BigInt(data.result) >= MIN_READY_USDC_ATOMIC;
  } catch (error) {
    console.error("Could not check source payer liquidity:", error);
  }
  cached = { until: Date.now() + 10_000, ready };
  return ready;
}
