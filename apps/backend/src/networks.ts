export interface NetworkConfig {
  name: string;
  chainId: number;
  caip2: `eip155:${number}`;
  currency: string;
  usdc?: `0x${string}`;
  usdt?: `0x${string}`;
  rpcUrl: string;
  explorerTxUrl: (hash: string) => string;
  explorerAddressUrl: (address: string) => string;
}

export type SupportedNetwork = "mainnet" | "testnet" | "botchain" | "botchain_testnet";

export const NETWORKS: Record<SupportedNetwork, NetworkConfig> = {
  mainnet: {
    name: "Base Mainnet",
    chainId: 8453,
    caip2: "eip155:8453",
    currency: "ETH",
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    rpcUrl: "https://mainnet.base.org",
    explorerTxUrl: (hash) => `https://basescan.org/tx/${hash}`,
    explorerAddressUrl: (addr) => `https://basescan.org/address/${addr}`,
  },
  testnet: {
    name: "Base Sepolia",
    chainId: 84532,
    caip2: "eip155:84532",
    currency: "ETH",
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    rpcUrl: "https://sepolia.base.org",
    explorerTxUrl: (hash) => `https://sepolia.basescan.org/tx/${hash}`,
    explorerAddressUrl: (addr) => `https://sepolia.basescan.org/address/${addr}`,
  },
  botchain: {
    name: "BOT Chain Mainnet",
    chainId: 677,
    caip2: "eip155:677",
    currency: "BOT",
    usdt: "0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C",
    rpcUrl: "https://rpc.botchain.ai",
    explorerTxUrl: (hash) => `https://scan.botchain.ai/tx/${hash}`,
    explorerAddressUrl: (addr) => `https://scan.botchain.ai/address/${addr}`,
  },
  botchain_testnet: {
    name: "BOT Chain Testnet",
    chainId: 968,
    caip2: "eip155:968",
    currency: "BOT",
    rpcUrl: "https://bundler.bohr.life/rpc",
    explorerTxUrl: (hash) => `https://scan.botchain.ai/tx/${hash}`,
    explorerAddressUrl: (addr) => `https://scan.botchain.ai/address/${addr}`,
  },
};

export function getActiveNetwork(): SupportedNetwork {
  const envNet = process.env.QERIN_NETWORK;
  if (envNet === "botchain") return "botchain";
  if (envNet === "botchain_testnet") return "botchain_testnet";
  if (envNet === "testnet") return "testnet";
  return "mainnet";
}

export function getNetwork(networkName?: string): NetworkConfig {
  if (networkName && networkName in NETWORKS) {
    return NETWORKS[networkName as SupportedNetwork];
  }
  return NETWORKS[getActiveNetwork()];
}

// QerinReceiptRegistry contract address (apps/contracts).
export function getRegistryAddress(): `0x${string}` | undefined {
  return process.env.QERIN_REGISTRY_ADDRESS as `0x${string}` | undefined;
}
