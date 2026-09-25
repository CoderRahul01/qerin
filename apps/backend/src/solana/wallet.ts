import { createKeyPairSignerFromBytes, getBase58Encoder, type KeyPairSigner } from "@solana/kit";

// Same lazy-getter shape as ../wallet.ts, for the same reason: Cloudflare
// Workers only populates `process.env` while handling a request, not at
// module-import time.
let signer: KeyPairSigner | null = null;

/**
 * A Solana wallet is a separate keypair from the EVM `QERIN_WALLET_PRIVATE_KEY`
 * — ed25519, not secp256k1, and not reusable across the two chain families.
 * Expected format: a base58-encoded 64-byte secret key, i.e. exactly what
 * `solana-keygen` prints as `[secretKey]` when exported, or what a wallet's
 * "export private key" flow gives you. Keep its balance small and provide it
 * via `wrangler secret put`, same as the EVM wallet.
 */
export async function getQerinSolanaSigner(): Promise<KeyPairSigner> {
  if (!signer) {
    const secretKeyBase58 = process.env.QERIN_SOLANA_WALLET_SECRET_KEY;

    if (!secretKeyBase58) {
      throw new Error(
        "QERIN_SOLANA_WALLET_SECRET_KEY is not set. This wallet pays x402 sources " +
          "on Solana with real USDC — keep its balance small, provide the key via " +
          "`wrangler secret put`, and never commit it or reuse it for anything else."
      );
    }

    const bytes = getBase58Encoder().encode(secretKeyBase58);
    if (bytes.length !== 64) {
      throw new Error(
        `QERIN_SOLANA_WALLET_SECRET_KEY must decode to a 64-byte secret key, got ${bytes.length} bytes`
      );
    }

    signer = await createKeyPairSignerFromBytes(bytes);
  }

  return signer;
}
