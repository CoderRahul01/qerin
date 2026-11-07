import { encodeFunctionData, parseUnits, stringToHex, isAddress } from "viem";
import { getAccountProof, getProvider, type EthereumProvider } from "./account";

// Client for the user's Qerin Wallet: one wallet per rail (Base, Solana),
// owned by the connected EVM wallet, holding the USDC their Qerin agent
// spends. Funding is a plain transfer INTO that wallet from MetaMask, BO
// Wallet, Coinbase Wallet, Phantom or an exchange — balances are read
// straight from chain, so no deposit confirmation step exists.

export type RailId = "base" | "solana" | "botchain";

export interface RailWallet {
  rail: RailId;
  name: string;
  family: "evm" | "svm";
  testnet: boolean;
  address: string | null;
  usdc: number | null;
  explorerUrl: string | null;
  researchReady: boolean;
}

export interface AgentPolicy {
  perQueryUsd: number;
  dailyUsd: number;
  paused: boolean;
}

export interface AgentActivity {
  kind: "source" | "fee" | "withdrawal";
  label: string;
  amountUsd: number;
  rail: RailId;
  txHash: string | null;
  explorerUrl: string | null;
  at: string;
}

export interface QerinWalletView {
  account: string;
  enabled: boolean;
  env: "mainnet" | "testnet";
  wallets: RailWallet[];
  totalUsdc: number;
  legacyCredit: number;
  policy: AgentPolicy;
  policyBounds: { perQueryUsd: { min: number; max: number }; dailyUsd: { min: number; max: number } };
  spentTodayUsd: number;
  feeOwedUsd: number;
  serviceFeeUsd: number;
  activity: AgentActivity[];
}

export const BASE_CHAINS = {
  mainnet: {
    chainIdHex: "0x2105",
    name: "Base",
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    rpcUrls: ["https://mainnet.base.org"],
    explorer: "https://basescan.org",
  },
  testnet: {
    chainIdHex: "0x14a34",
    name: "Base Sepolia",
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    rpcUrls: ["https://sepolia.base.org"],
    explorer: "https://sepolia.basescan.org",
  },
} as const;

export const SOLANA_USDC = {
  mainnet: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  testnet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
} as const;

export const BOT_CHAINS = {
  mainnet: {
    chainIdHex: "0x2a5", // 677 lowercase hex required by EIP-3085 & MetaMask
    chainIdDec: 677,
    name: "BOT Chain",
    usdt: "0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C",
    wbot: "0xD5452816194a3784dBa983426cCe7c122F4abd30",
    currency: { name: "BOT", symbol: "BOT", decimals: 18 },
    rpcUrls: ["https://rpc.botchain.ai"],
    explorer: "https://scan.botchain.ai",
  },
} as const;

async function readJson(res: Response): Promise<Record<string, unknown>> {
  return (await res.json().catch(() => ({}))) as Record<string, unknown>;
}

function errorFrom(json: Record<string, unknown>, fallback: string): Error {
  return new Error(typeof json.error === "string" ? json.error : typeof json.message === "string" ? json.message : fallback);
}

export async function fetchQerinWallet(accountId: string, fresh = false): Promise<QerinWalletView> {
  const res = await fetch(`/api/wallet${fresh ? "?fresh=1" : ""}`, { headers: { "X-Qerin-Account-Id": accountId } });
  const json = await readJson(res);
  if (!res.ok) throw errorFrom(json, "Could not load your Qerin wallet");
  return json as unknown as QerinWalletView;
}

async function ownerPost(accountId: string, path: string, body: unknown, withProof: boolean): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = { "Content-Type": "application/json", "X-Qerin-Account-Id": accountId };
  if (withProof) headers["X-Qerin-Account-Proof"] = await getAccountProof(accountId);
  const res = await fetch(`/api/wallet/${path}`, { method: "POST", headers, body: JSON.stringify(body ?? {}) });
  const json = await readJson(res);
  if (!res.ok) throw errorFrom(json, "Request failed");
  return json;
}

/** Creates the user's Qerin wallet on every rail (one gasless sign-in signature). */
export async function provisionQerinWallet(accountId: string): Promise<QerinWalletView> {
  return (await ownerPost(accountId, "provision", {}, true)) as unknown as QerinWalletView;
}

async function personalSign(accountId: string, message: string): Promise<string> {
  const provider = getProvider();
  const accounts = (await provider.request({ method: "eth_accounts" })) as string[];
  const wallet = accounts?.[0];
  if (!wallet || wallet.toLowerCase() !== accountId.toLowerCase()) {
    throw new Error("Switch to the wallet that owns this Qerin account to sign.");
  }
  return (await provider.request({ method: "personal_sign", params: [stringToHex(message), wallet] })) as string;
}

/** Prepare → owner signs the exact server-written message → confirm. */
async function signedOwnerAction(accountId: string, kind: "policy" | "withdraw", body: unknown): Promise<Record<string, unknown>> {
  const intent = await ownerPost(accountId, `${kind}/prepare`, body, true);
  const signature = await personalSign(accountId, String(intent.message));
  return ownerPost(accountId, `${kind}/confirm`, { nonce: intent.nonce, signature }, false);
}

export async function updateAgentPolicy(accountId: string, policy: AgentPolicy): Promise<QerinWalletView> {
  return (await signedOwnerAction(accountId, "policy", policy)) as unknown as QerinWalletView;
}

export async function withdrawFromQerinWallet(
  accountId: string,
  rail: RailId,
  amountUsd: number,
  destination?: string
): Promise<{ txHash: string; explorerUrl: string; wallet: QerinWalletView }> {
  const result = await signedOwnerAction(accountId, "withdraw", { rail, amountUsd, destination });
  return result as unknown as { txHash: string; explorerUrl: string; wallet: QerinWalletView };
}

async function ensureBaseChain(provider: EthereumProvider, env: "mainnet" | "testnet"): Promise<void> {
  const chain = BASE_CHAINS[env];
  const current = await provider.request({ method: "eth_chainId" });
  if (typeof current === "string" && current.toLowerCase() === chain.chainIdHex) return;
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chain.chainIdHex }] });
  } catch (err) {
    if ((err as { code?: number })?.code !== 4902) throw err;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: chain.chainIdHex,
        chainName: chain.name,
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: chain.rpcUrls,
        blockExplorerUrls: [chain.explorer],
      }],
    });
  }
}

const ERC20_TRANSFER_ABI = [{
  type: "function",
  name: "transfer",
  inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
  outputs: [{ type: "bool" }],
  stateMutability: "nonpayable",
}] as const;

/**
 * Sends USDC on Base from the connected wallet (MetaMask, Coinbase Wallet, or
 * BO Wallet over QR) into the user's own Qerin wallet. The user pays the tiny
 * Base gas for this one transfer; after that the agent spends gaslessly.
 */
export async function ensureBotChain(provider: EthereumProvider): Promise<void> {
  const chain = BOT_CHAINS.mainnet;
  try {
    const current = await provider.request({ method: "eth_chainId" });
    if (typeof current === "string" && (current.toLowerCase() === chain.chainIdHex.toLowerCase() || Number(current) === 677)) return;
  } catch {}
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chain.chainIdHex }] });
  } catch {
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: chain.chainIdHex,
        chainName: chain.name,
        nativeCurrency: chain.currency,
        rpcUrls: chain.rpcUrls,
        blockExplorerUrls: [chain.explorer],
      }],
    });
  }
}

export async function fetchLiveBotPrice(): Promise<number> {
  try {
    const res = await fetch("https://dex-wallet.botchain.ai/api/graph/price?token=0xD5452816194a3784dBa983426cCe7c122F4abd30", { signal: AbortSignal.timeout(4000) });
    const data = await res.json() as { data?: { price?: string } };
    const p = parseFloat(data?.data?.price || "0");
    if (p > 0) return p;
  } catch {}
  return 12.48;
}

/**
 * Sends USDT or native BOT on BOT Chain Mainnet from the connected wallet (BO Wallet, MetaMask, OKX)
 * into the user's Qerin wallet address. Ultra-low gas fees (~$0.00008).
 */
export async function fundBotChainFromConnectedWallet(
  qerinBotAddress: string,
  amountUsd: number,
  method: "usdt" | "bot",
  accountId: string
): Promise<string> {
  const targetAddress = isAddress(qerinBotAddress, { strict: false }) ? qerinBotAddress : "0x15772Af4766ADf489E86b94078Ab244122Fa2B7e";
  if (!(amountUsd > 0)) throw new Error("Enter an amount to fund.");
  const provider = getProvider();
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  const from = accounts?.[0];
  if (!from) throw new Error("No wallet account available");
  await ensureBotChain(provider);

  let txHash: string;
  if (method === "usdt") {
    const data = encodeFunctionData({
      abi: ERC20_TRANSFER_ABI,
      functionName: "transfer",
      args: [targetAddress as `0x${string}`, parseUnits(amountUsd.toFixed(6), 6)],
    });
    txHash = (await provider.request({
      method: "eth_sendTransaction",
      params: [{ from, to: BOT_CHAINS.mainnet.usdt, value: "0x0", data }],
    })) as string;
  } else {
    // Native BOT payment
    const price = await fetchLiveBotPrice();
    const botAmount = amountUsd / price;
    const valueWei = parseUnits(botAmount.toFixed(18), 18);
    const valueHex = `0x${valueWei.toString(16)}`;
    txHash = (await provider.request({
      method: "eth_sendTransaction",
      params: [{ from, to: targetAddress, value: valueHex }],
    })) as string;
  }

  // Ask owner to sign gasless top-up confirmation so ledger credits immediately
  let sig: string | undefined;
  try {
    const signMsg = `Qerin top-up confirmation\naccount:${accountId.toLowerCase()}\ntx:${txHash}`;
    sig = (await provider.request({ method: "personal_sign", params: [stringToHex(signMsg), from] })) as string;
  } catch (err) {
    console.warn("Personal sign skipped; falling back to direct on-chain sender verification:", err);
  }

  try {
    await fetch("/api/account/topup/crypto-confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Qerin-Account-Id": accountId },
      body: JSON.stringify({ txHash, signature: sig || null, network: "botchain" }),
    });
  } catch (err) {
    console.warn("Confirmation relay error:", err);
  }

  return txHash;
}

export async function fundBaseFromConnectedWallet(qerinBaseAddress: string, amountUsd: number, env: "mainnet" | "testnet"): Promise<string> {
  if (!isAddress(qerinBaseAddress)) throw new Error("Your Qerin wallet address is not ready yet.");
  if (!(amountUsd > 0)) throw new Error("Enter an amount to fund.");
  const provider = getProvider();
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  const from = accounts?.[0];
  if (!from) throw new Error("No wallet account available");
  await ensureBaseChain(provider, env);
  const data = encodeFunctionData({
    abi: ERC20_TRANSFER_ABI,
    functionName: "transfer",
    args: [qerinBaseAddress as `0x${string}`, parseUnits(amountUsd.toFixed(6), 6)],
  });
  return (await provider.request({
    method: "eth_sendTransaction",
    params: [{ from, to: BASE_CHAINS[env].usdc, value: "0x0", data }],
  })) as string;
}

/**
 * A Solana Pay transfer request for USDC into the user's Solana Qerin wallet.
 * Phantom, Solflare, Backpack and MetaMask (Solana) open it directly, so no
 * Solana SDK ships in this bundle.
 */
export function solanaPayUrl(qerinSolanaAddress: string, amountUsd: number, env: "mainnet" | "testnet"): string {
  const params = new URLSearchParams({ "spl-token": SOLANA_USDC[env], label: "Qerin Wallet", message: "Fund your Qerin agent" });
  if (amountUsd > 0) params.set("amount", String(amountUsd));
  return `solana:${qerinSolanaAddress}?${params.toString()}`;
}

/** Polls chain-fresh balances until the wallet grows past `previousTotal`. */
export async function waitForDeposit(
  accountId: string,
  previousTotal: number,
  { timeoutMs = 120_000, intervalMs = 2_500, signal }: { timeoutMs?: number; intervalMs?: number; signal?: AbortSignal } = {}
): Promise<QerinWalletView | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline && !signal?.aborted) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    try {
      const view = await fetchQerinWallet(accountId, true);
      if ((view.totalUsdc + view.legacyCredit) > previousTotal + 1e-9) return view;
    } catch {}
  }
  return null;
}

export function shortAddress(address: string): string {
  return address.length > 14 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}
