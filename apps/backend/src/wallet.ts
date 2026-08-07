import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";

// Lazily constructed: Cloudflare Workers only populates `process.env` while
// handling a request (via nodejs_compat), not at module-import time — a
// top-level `const` here would read an empty env on cold start. Every
// caller goes through this memoized getter instead.
let account: PrivateKeyAccount | null = null;

export function getQerinAccount(): PrivateKeyAccount {
  if (!account) {
    const privateKey = process.env.QERIN_WALLET_PRIVATE_KEY as `0x${string}` | undefined;

    if (!privateKey) {
      throw new Error(
        "QERIN_WALLET_PRIVATE_KEY is not set. This wallet pays real x402 sources " +
          "on Base mainnet with real USDC and receives developer payments to " +
          "/v1/paid/answer — keep its balance small, provide the key via " +
          "`wrangler secret put`, and never commit it or reuse it for anything else."
      );
    }

    account = privateKeyToAccount(privateKey);
  }

  return account;
}
