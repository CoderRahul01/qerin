// Solana top-up support, parallel to cryptoTopup.ts's EVM flow. Kept as a
// separate module rather than folded into cryptoTopup.ts: Solana wallets
// speak a different injected-provider shape (no EIP-1193, no chainId
// switching, ed25519 signatures instead of ECDSA) and TOPUP_NETWORKS'
// NetworkMeta type is EVM-shaped (0x addresses, chainIdHex) throughout.
//
// Beta scope: devnet only. Do not point this at solana_mainnet until the
// deposit wallet is funded and this flow has been exercised end-to-end —
// mislabeling a devnet address as mainnet would make a real deposit
// unrecoverable.
export const SOLANA_NETWORK: {
  id: "solana_devnet";
  name: string;
  currency: "SOL";
  tokenSymbol: "USDC";
  explorerTxUrl: (signature: string) => string;
  explorerAddressUrl: (address: string) => string;
} = {
  id: "solana_devnet",
  name: "Solana Devnet (Beta)",
  currency: "SOL",
  tokenSymbol: "USDC",
  explorerTxUrl: (signature) => `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
  explorerAddressUrl: (address) => `https://explorer.solana.com/address/${address}?cluster=devnet`,
};

interface SolanaSignMessageResult {
  signature: Uint8Array;
  publicKey: { toBase58(): string };
}

export interface SolanaProvider {
  isPhantom?: boolean;
  publicKey?: { toBase58(): string } | null;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toBase58(): string } }>;
  signMessage: (message: Uint8Array, display?: "utf8") => Promise<SolanaSignMessageResult>;
}

declare global {
  interface Window {
    phantom?: { solana?: SolanaProvider };
    solana?: SolanaProvider;
  }
}

/** Phantom is Colosseum's recommended embedded/injected Solana wallet — see https://docs.phantom.com/phantom-connect */
export function getInjectedSolanaProvider(): SolanaProvider | null {
  if (typeof window === "undefined") return null;
  if (window.phantom?.solana?.isPhantom) return window.phantom.solana;
  if (window.solana?.isPhantom) return window.solana;
  return window.solana ?? null;
}

export async function connectSolanaWallet(): Promise<string> {
  const provider = getInjectedSolanaProvider();
  if (!provider) {
    throw new Error("No Solana wallet detected. Install Phantom (phantom.com) and refresh.");
  }
  const { publicKey } = await provider.connect();
  return publicKey.toBase58();
}

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function encodeBase58(bytes: Uint8Array): string {
  const BASE = BigInt(58);
  let value = BigInt(0);
  for (const byte of bytes) value = value * BigInt(256) + BigInt(byte);
  let out = "";
  while (value > BigInt(0)) {
    out = BASE58_ALPHABET[Number(value % BASE)] + out;
    value /= BASE;
  }
  for (const byte of bytes) {
    if (byte !== 0) break;
    out = "1" + out;
  }
  return out || "1";
}

/**
 * Signs the same `accountId + txSignature` binding message the backend
 * verifies in solana/topup.ts's verifyAndCreditSolanaDeposit — proves this
 * browser controls the address that actually sent the deposit.
 */
export async function signSolanaTopupConfirmation(
  accountId: string,
  txSignature: string
): Promise<{ signature: string; publicKey: string }> {
  const provider = getInjectedSolanaProvider();
  if (!provider) {
    throw new Error("No Solana wallet detected. Install Phantom (phantom.com) and refresh.");
  }
  // Phantom requires an explicit connect() before it will honor signMessage.
  if (!provider.publicKey) {
    await provider.connect();
  }
  const message = `Qerin top-up confirmation\naccount:${accountId}\ntx:${txSignature}`;
  const encoded = new TextEncoder().encode(message);
  const { signature, publicKey } = await provider.signMessage(encoded, "utf8");
  return { signature: encodeBase58(signature), publicKey: publicKey.toBase58() };
}
