export interface NetworkConfig {
  caip2: `eip155:${number}`;
  usdc: `0x${string}`;
  explorerTxUrl: (hash: string) => string;
}

export const NETWORKS: Record<"mainnet" | "testnet", NetworkConfig> = {
  mainnet: {
    caip2: "eip155:8453",
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    explorerTxUrl: (hash) => `https://basescan.org/tx/${hash}`,
  },
  testnet: {
    caip2: "eip155:84532",
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    explorerTxUrl: (hash) => `https://sepolia.basescan.org/tx/${hash}`,
  },
};

// Real x402 sources (CryptoSlate, Superhighway, Veles) only exist on Base
// mainnet — there is no testnet equivalent of these production services.
//
// Reads process.env lazily (called from within request handling, never at
// module-import time) — see wallet.ts for why that matters on Workers.
export function getActiveNetwork(): "mainnet" | "testnet" {
  return process.env.QERIN_NETWORK === "testnet" ? "testnet" : "mainnet";
}

export function getNetwork(): NetworkConfig {
  return NETWORKS[getActiveNetwork()];
}

// QerinReceiptRegistry contract address (apps/contracts). Unset until deployed —
// recordReceipt.ts treats a missing address as "registry logging disabled" rather
// than an error, so the answer flow never depends on this being configured.
export function getRegistryAddress(): `0x${string}` | undefined {
  return process.env.QERIN_REGISTRY_ADDRESS as `0x${string}` | undefined;
}
