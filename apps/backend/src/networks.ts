export interface NetworkConfig {
  name: string;
  chainId: number;
  caip2: `eip155:${number}`;
  currency: string;
  usdc?: `0x${string}`;
  usdt?: `0x${string}`;
  wbot?: `0x${string}`;
  rpcUrl: string;
  wsRpc?: string;
  bundlerRpc?: string;
  dexUniversalRouter?: `0x${string}`;
  dexSwapRouter?: `0x${string}`;
  dexFactory?: `0x${string}`;
  dexQuoterV2?: `0x${string}`;
  certikAuditUrl?: string;
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
    wbot: "0xD5452816194a3784dBa983426cCe7c122F4abd30",
    rpcUrl: "https://rpc.botchain.ai",
    wsRpc: "wss://ws-rpc.botchain.ai",
    bundlerRpc: "https://bundler.botchain.ai/rpc",
    dexUniversalRouter: "0xaE6ae8630f7A888dEc0B9195C85F7515d5887655",
    dexSwapRouter: "0x07032d47A1b9f8460cBeE9dC17c1d3E438693929",
    dexFactory: "0x1C51c173323ec11BB4e3C4fD2314c225Dc4b5419",
    dexQuoterV2: "0x034A705b36067cff99ABf5C662Be881cBd8d0176",
    certikAuditUrl: "https://skynet.certik.com/projects/botchain",
    explorerTxUrl: (hash) => `https://scan.botchain.ai/tx/${hash}`,
    explorerAddressUrl: (addr) => `https://scan.botchain.ai/address/${addr}`,
  },
  botchain_testnet: {
    name: "BOT Chain Testnet",
    chainId: 968,
    caip2: "eip155:968",
    currency: "BOT",
    rpcUrl: "https://rpc.bohr.life",
    bundlerRpc: "https://bundler.bohr.life/rpc",
    dexUniversalRouter: "0x73Be0A1d8011B335A7aBeF6c45544E8ca4448AB5",
    certikAuditUrl: "https://skynet.certik.com/projects/botchain",
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

// QerinReceiptRegistry contract address (apps/contracts). A registry deployed
// on Base has a different address than one deployed on BOT Chain — they are
// separate contracts on separate chains, not one contract reachable from
// both. Per-network env vars (QERIN_REGISTRY_ADDRESS_MAINNET,
// QERIN_REGISTRY_ADDRESS_BOTCHAIN, etc.) take precedence; QERIN_REGISTRY_ADDRESS
// remains as a fallback so a single-chain (Base-only) deployment keeps
// working unchanged.
export function getRegistryAddress(networkName?: string): `0x${string}` | undefined {
  const net = (networkName && networkName in NETWORKS ? networkName : getActiveNetwork()) as SupportedNetwork;
  const perNetworkVar = `QERIN_REGISTRY_ADDRESS_${net.toUpperCase()}`;
  const value = process.env[perNetworkVar] || process.env.QERIN_REGISTRY_ADDRESS;
  return value as `0x${string}` | undefined;
}
