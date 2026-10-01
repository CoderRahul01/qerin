import { getRail } from "./rails.js";
import { getQerinAccount } from "./wallet.js";

// Only legacy prepaid credit (bought before personal Qerin wallets) is spent
// from Qerin's shared wallet. This reports whether that wallet happens to
// hold enough USDC to honor such credit. It is never a requirement: with no
// key configured or an empty wallet, legacy credit simply can't be spent and
// every user runs research from their own Qerin wallet instead.
const MIN_READY_USDC_ATOMIC = 70_000n;
let cached: { until: number; ready: boolean } | null = null;

export async function paidSourcesReady(): Promise<boolean> {
  if (cached && cached.until > Date.now()) return cached.ready;
  const base = getRail("base");
  let ready = false;
  try {
    if (!base || !process.env.QERIN_WALLET_PRIVATE_KEY) throw new Error("no shared payer configured");
    const address = getQerinAccount().address.slice(2).toLowerCase().padStart(64, "0");
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
  } catch {
    ready = false;
  }
  cached = { until: Date.now() + 10_000, ready };
  return ready;
}
