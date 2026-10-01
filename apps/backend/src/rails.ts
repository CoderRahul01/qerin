import {
  SOLANA_DEVNET_CAIP2,
  SOLANA_MAINNET_CAIP2,
  USDC_DEVNET_ADDRESS,
  USDC_MAINNET_ADDRESS,
} from "@x402/svm";

// Payment rails: every chain a user's Qerin wallet can hold USDC on and the
// Qerin agent can spend from. A rail is chain-family agnostic config only —
// the wallet that signs on it lives in agentWallet.ts (EVM) or
// solana/agentWallet.ts (SVM). Adding a chain later means one entry here plus
// a signer for its family, not a new payment path.
//
// QERIN_WALLET_ENV switches every rail between mainnet and testnet at once.
// Mixing them (real Base USDC next to free devnet USDC) would show users a
// single "balance" that is part real money and part test tokens, so the
// switch is deliberately global rather than per chain.

export type RailId = "base" | "solana";
export type RailFamily = "evm" | "svm";

export interface PaymentRail {
  id: RailId;
  family: RailFamily;
  name: string;
  /** x402 / CAIP-2 network id. */
  caip2: string;
  /** Network name CDP's account APIs use for this chain. */
  cdpNetwork: string;
  usdc: string;
  rpcUrl: string;
  testnet: boolean;
  explorerTxUrl: (tx: string) => string;
  explorerAddressUrl: (address: string) => string;
}

export type WalletEnv = "mainnet" | "testnet";

export function getWalletEnv(): WalletEnv {
  return process.env.QERIN_WALLET_ENV === "testnet" ? "testnet" : "mainnet";
}

function baseRail(env: WalletEnv): PaymentRail {
  if (env === "testnet") {
    return {
      id: "base",
      family: "evm",
      name: "Base Sepolia",
      caip2: "eip155:84532",
      cdpNetwork: "base-sepolia",
      usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      rpcUrl: process.env.QERIN_BASE_RPC_URL || "https://sepolia.base.org",
      testnet: true,
      explorerTxUrl: (tx) => `https://sepolia.basescan.org/tx/${tx}`,
      explorerAddressUrl: (a) => `https://sepolia.basescan.org/address/${a}`,
    };
  }
  return {
    id: "base",
    family: "evm",
    name: "Base",
    caip2: "eip155:8453",
    cdpNetwork: "base",
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    rpcUrl: process.env.QERIN_BASE_RPC_URL || "https://mainnet.base.org",
    testnet: false,
    explorerTxUrl: (tx) => `https://basescan.org/tx/${tx}`,
    explorerAddressUrl: (a) => `https://basescan.org/address/${a}`,
  };
}

function solanaRail(env: WalletEnv): PaymentRail {
  const devnet = env === "testnet";
  const suffix = devnet ? "?cluster=devnet" : "";
  return {
    id: "solana",
    family: "svm",
    name: devnet ? "Solana Devnet" : "Solana",
    caip2: devnet ? SOLANA_DEVNET_CAIP2 : SOLANA_MAINNET_CAIP2,
    cdpNetwork: devnet ? "solana-devnet" : "solana",
    usdc: devnet ? USDC_DEVNET_ADDRESS : USDC_MAINNET_ADDRESS,
    // The public endpoints are heavily rate-limited; a free Helius/QuickNode
    // URL here removes that ceiling without changing any code.
    rpcUrl: process.env.QERIN_SOLANA_RPC_URL || (devnet ? "https://api.devnet.solana.com" : "https://api.mainnet-beta.solana.com"),
    testnet: devnet,
    explorerTxUrl: (tx) => `https://explorer.solana.com/tx/${tx}${suffix}`,
    explorerAddressUrl: (a) => `https://explorer.solana.com/address/${a}${suffix}`,
  };
}

/** Enabled rails, in the order the agent prefers to spend from them. */
export function getRails(): PaymentRail[] {
  const env = getWalletEnv();
  const rails = [baseRail(env)];
  if (process.env.QERIN_SOLANA_WALLETS !== "off") rails.push(solanaRail(env));
  return rails;
}

export function getRail(id: string): PaymentRail | null {
  return getRails().find((rail) => rail.id === id) ?? null;
}

export function getRailByCaip2(caip2: string): PaymentRail | null {
  return getRails().find((rail) => rail.caip2 === caip2) ?? null;
}

export const USDC_ATOMIC = 1_000_000;

export function usdToAtomic(usd: number): bigint {
  return BigInt(Math.round(usd * USDC_ATOMIC));
}

export function atomicToUsd(atomic: bigint | string): number {
  return Number(BigInt(atomic)) / USDC_ATOMIC;
}
