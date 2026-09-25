import {
  SOLANA_DEVNET_CAIP2,
  SOLANA_MAINNET_CAIP2,
  USDC_DEVNET_ADDRESS,
  USDC_MAINNET_ADDRESS,
} from "@x402/svm";

// Solana is not EVM: addresses are base58 ed25519 pubkeys, there is no
// `0x`-prefixed chain id, and settlement is verified via transaction
// signatures rather than `eth_getTransactionReceipt`. This config
// intentionally does NOT extend `NETWORKS` in ../networks.ts — that map's
// `NetworkConfig` type bakes in `eip155:${number}` and `0x${string}`, which
// would misrepresent a Solana network as an EVM one. Keep the two chain
// families in separate modules until there is a real shared abstraction to
// unify them under, rather than forcing a fit today.
export interface SolanaNetworkConfig {
  name: string;
  /** x402 CAIP-2-style network id, as exported by @x402/svm. */
  caip2: `${string}:${string}`;
  cluster: "mainnet-beta" | "devnet";
  usdc: string;
  rpcUrl: string;
  explorerTxUrl: (signature: string) => string;
  explorerAddressUrl: (address: string) => string;
}

export type SupportedSolanaNetwork = "solana_mainnet" | "solana_devnet";

export const SOLANA_NETWORKS: Record<SupportedSolanaNetwork, SolanaNetworkConfig> = {
  solana_mainnet: {
    name: "Solana Mainnet",
    caip2: SOLANA_MAINNET_CAIP2,
    cluster: "mainnet-beta",
    usdc: USDC_MAINNET_ADDRESS,
    rpcUrl: "https://api.mainnet-beta.solana.com",
    explorerTxUrl: (signature) => `https://explorer.solana.com/tx/${signature}`,
    explorerAddressUrl: (address) => `https://explorer.solana.com/address/${address}`,
  },
  solana_devnet: {
    name: "Solana Devnet",
    caip2: SOLANA_DEVNET_CAIP2,
    cluster: "devnet",
    usdc: USDC_DEVNET_ADDRESS,
    rpcUrl: "https://api.devnet.solana.com",
    explorerTxUrl: (signature) => `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    explorerAddressUrl: (address) => `https://explorer.solana.com/address/${address}?cluster=devnet`,
  },
};

export function getActiveSolanaNetwork(): SupportedSolanaNetwork {
  return process.env.QERIN_SOLANA_NETWORK === "solana_mainnet" ? "solana_mainnet" : "solana_devnet";
}

export function getSolanaNetwork(networkName?: string): SolanaNetworkConfig {
  if (networkName && networkName in SOLANA_NETWORKS) {
    return SOLANA_NETWORKS[networkName as SupportedSolanaNetwork];
  }
  return SOLANA_NETWORKS[getActiveSolanaNetwork()];
}
