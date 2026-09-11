import {
  encodeFunctionData,
  parseUnits,
  stringToHex,
  formatUnits,
  formatEther,
  parseEther,
} from "viem";
import { getProvider, type EthereumProvider } from "./account";

export type TopupNetwork = "base" | "botchain";

export interface NetworkMeta {
  id: TopupNetwork;
  name: string;
  chainIdHex: string;
  chainIdDec: number;
  currency: string;
  tokenSymbol: string;
  tokenDecimals: number;
  tokenAddress: `0x${string}`;
  tokenLogo: string;
  rpcUrls: string[];
  blockExplorerUrls: string[];
}

export const TOPUP_NETWORKS: Record<TopupNetwork, NetworkMeta> = {
  base: {
    id: "base",
    name: "Base Mainnet",
    chainIdHex: "0x2105", // 8453
    chainIdDec: 8453,
    currency: "ETH",
    tokenSymbol: "USDC",
    tokenDecimals: 6,
    tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    tokenLogo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png",
    rpcUrls: ["https://mainnet.base.org"],
    blockExplorerUrls: ["https://basescan.org"],
  },
  botchain: {
    id: "botchain",
    name: "BOT Chain Mainnet",
    chainIdHex: "0x2A5", // 677
    chainIdDec: 677,
    currency: "BOT",
    tokenSymbol: "USDT",
    tokenDecimals: 6,
    tokenAddress: "0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C",
    tokenLogo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png",
    rpcUrls: ["https://rpc.botchain.ai"],
    blockExplorerUrls: ["https://scan.botchain.ai"],
  },
};

const PENDING_KEY_PREFIX = "qerin_pending_topup_";
const WBOT_ADDRESS = "0xD5452816194a3784dBa983426cCe7c122F4abd30";
const BOT_PRICE_FALLBACK = 12.20;

// ── Live BOT Price ────────────────────────────────────────────────────────────

let _botPriceCache: { price: number; ts: number } | null = null;
const BOT_PRICE_TTL_MS = 5 * 60 * 1000;

export async function fetchBotPrice(): Promise<number> {
  const now = Date.now();
  if (_botPriceCache && now - _botPriceCache.ts < BOT_PRICE_TTL_MS) {
    return _botPriceCache.price;
  }
  try {
    const res = await fetch(
      `https://dex-wallet.botchain.ai/api/graph/price?token=${WBOT_ADDRESS}`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { success: boolean; data?: { price?: string } };
    const priceStr = body?.data?.price;
    const price = priceStr ? parseFloat(priceStr) : 0;
    if (price > 0) {
      _botPriceCache = { price, ts: now };
      return price;
    }
  } catch {}
  return BOT_PRICE_FALLBACK;
}

/**
 * For BOT Chain native BOT payment: calculate how much BOT is needed
 * for the given USD amount, using live price.
 */
export async function usdToBotAmount(amountUsd: number): Promise<number> {
  const price = await fetchBotPrice();
  return amountUsd / price;
}

// ── Wallet Utilities ─────────────────────────────────────────────────────────

export async function ensureNetwork(provider: EthereumProvider, network: TopupNetwork): Promise<void> {
  const meta = TOPUP_NETWORKS[network];
  const currentChain = await provider.request({ method: "eth_chainId" });
  if (currentChain === meta.chainIdHex) return;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: meta.chainIdHex }],
    });
  } catch (err) {
    if ((err as { code?: number })?.code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: meta.chainIdHex,
            chainName: meta.name,
            nativeCurrency: { name: meta.currency, symbol: meta.currency, decimals: 18 },
            rpcUrls: meta.rpcUrls,
            blockExplorerUrls: meta.blockExplorerUrls,
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

const ERC20_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

const ERC20_BALANCE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;

// ── Pending Payment Recovery ──────────────────────────────────────────────────

export interface PendingTopup {
  txHash: string;
  amountUsd: number;
  network?: TopupNetwork;
  paymentMethod?: "token" | "native";
  sentAt: number;
}

function pendingKey(accountId: string): string {
  return `${PENDING_KEY_PREFIX}${accountId}`;
}

export function getPendingTopup(accountId: string): PendingTopup | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(pendingKey(accountId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingTopup;
  } catch {
    return null;
  }
}

export function savePendingTopup(accountId: string, record: PendingTopup): void {
  window.localStorage.setItem(pendingKey(accountId), JSON.stringify(record));
}

export function clearPendingTopup(accountId: string): void {
  window.localStorage.removeItem(pendingKey(accountId));
}

// ── Wallet Diagnostics ────────────────────────────────────────────────────────

export async function registerAssetInWallet(network: TopupNetwork = "base"): Promise<boolean> {
  const provider = getProvider();
  const meta = TOPUP_NETWORKS[network];
  try {
    const success = (await provider.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: {
          address: meta.tokenAddress,
          symbol: meta.tokenSymbol,
          decimals: meta.tokenDecimals,
          image: meta.tokenLogo,
        },
      } as Record<string, unknown>,
    })) as boolean;
    return Boolean(success);
  } catch {
    return false;
  }
}

export interface WalletBalanceReport {
  account: string;
  nativeBalance: string;
  tokenBalance: string;
  nativeNumeric: number;
  tokenNumeric: number;
  botPrice?: number;
}

export async function checkWalletBalances(network: TopupNetwork = "base"): Promise<WalletBalanceReport> {
  const provider = getProvider();
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  const account = accounts[0];
  if (!account) throw new Error("No wallet account connected");

  await ensureNetwork(provider, network);
  const meta = TOPUP_NETWORKS[network];

  let nativeBalance = "0.0000";
  let nativeNumeric = 0;
  try {
    const rawNative = (await provider.request({
      method: "eth_getBalance",
      params: [account, "latest"],
    })) as string;
    const wei = BigInt(rawNative || "0");
    nativeNumeric = Number(formatEther(wei));
    nativeBalance = nativeNumeric.toFixed(4);
  } catch {}

  let tokenBalance = "0.00";
  let tokenNumeric = 0;
  try {
    const data = encodeFunctionData({
      abi: ERC20_BALANCE_ABI,
      functionName: "balanceOf",
      args: [account as `0x${string}`],
    });
    const rawToken = (await provider.request({
      method: "eth_call",
      params: [{ to: meta.tokenAddress, data }, "latest"],
    })) as string;
    const atomic = BigInt(rawToken || "0");
    tokenNumeric = Number(formatUnits(atomic, meta.tokenDecimals));
    tokenBalance = tokenNumeric.toFixed(2);
  } catch {}

  // Fetch live BOT price for BOT Chain network
  let botPrice: number | undefined;
  if (network === "botchain") {
    botPrice = await fetchBotPrice().catch(() => BOT_PRICE_FALLBACK);
  }

  return {
    account,
    nativeBalance,
    tokenBalance,
    nativeNumeric,
    tokenNumeric,
    botPrice,
  };
}

// ── Deposit Flow ──────────────────────────────────────────────────────────────

export async function sendCryptoDeposit(
  accountId: string,
  amountUsd: number,
  network: TopupNetwork = "base",
  paymentMethod: "token" | "native" = network === "botchain" ? "native" : "token"
): Promise<string> {
  const provider = getProvider();
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  const from = accounts[0];
  if (!from) throw new Error("No wallet account available");

  await ensureNetwork(provider, network);
  const meta = TOPUP_NETWORKS[network];

  // Fetch destination settlement address + network info
  const infoRes = await fetch(`/api/network-info?network=${network}`);
  const info = await infoRes.json().catch(() => ({}));
  const payTo = (info.payTo || "0x5b2131e9b28a46Ec10D260A14B9DEB34554311F2") as `0x${string}`;

  // Pre-flight balance diagnostics
  let diag: WalletBalanceReport | null = null;
  try {
    diag = await checkWalletBalances(network);
  } catch {}

  if (diag) {
    if (paymentMethod === "native") {
      // For native BOT payment: check BOT balance is sufficient
      if (network === "botchain") {
        const botPrice = diag.botPrice ?? BOT_PRICE_FALLBACK;
        const botNeeded = amountUsd / botPrice;
        // Add 10% buffer for gas
        const botRequired = botNeeded * 1.10;
        if (diag.nativeNumeric < botRequired) {
          throw new Error(
            `Insufficient BOT balance: Your wallet holds ${diag.nativeBalance} BOT on ${meta.name}. You need ~${botNeeded.toFixed(4)} BOT (+ gas) for this payment.`
          );
        }
      } else {
        // ETH native on Base
        if (diag.nativeNumeric <= 0.0001) {
          throw new Error(
            `Insufficient ETH balance on ${meta.name}. Your wallet holds ${diag.nativeBalance} ETH.`
          );
        }
      }
    } else {
      // ERC-20 token payment
      if (diag.nativeNumeric <= 0.00005) {
        throw new Error(
          `Insufficient gas on ${meta.name}. Your wallet holds ${diag.nativeBalance} ${meta.currency}. A small amount of ${meta.currency} is needed for gas fees.`
        );
      }
      if (diag.tokenNumeric < amountUsd) {
        throw new Error(
          `Insufficient ${meta.tokenSymbol} balance: Your wallet holds ${diag.tokenBalance} ${meta.tokenSymbol} on ${meta.name} (required: $${amountUsd}.00). You can switch to Native BOT payment above.`
        );
      }
    }
  }

  let txHash: string;

  if (paymentMethod === "native") {
    let weiAmount: bigint;
    if (network === "botchain") {
      const botPrice = diag?.botPrice ?? info.botPrice ?? BOT_PRICE_FALLBACK;
      const botAmount = amountUsd / botPrice;
      weiAmount = parseEther(botAmount.toFixed(8));
    } else {
      // Base: ETH at ~$2500 fallback
      weiAmount = parseEther((amountUsd / 2500).toFixed(8));
    }

    txHash = (await provider.request({
      method: "eth_sendTransaction",
      params: [{ from, to: payTo, value: `0x${weiAmount.toString(16)}`, data: "0x" }],
    })) as string;
  } else {
    // ERC-20 token payment
    const tokenContract = (info.usdc || info.usdt || meta.tokenAddress) as `0x${string}`;
    const amountAtomic = parseUnits(amountUsd.toString(), meta.tokenDecimals);
    const data = encodeFunctionData({
      abi: ERC20_TRANSFER_ABI,
      functionName: "transfer",
      args: [payTo, amountAtomic],
    });

    txHash = (await provider.request({
      method: "eth_sendTransaction",
      params: [{ from, to: tokenContract, value: "0x0", data }],
    })) as string;
  }

  savePendingTopup(accountId, { txHash, amountUsd, network, paymentMethod, sentAt: Date.now() });
  return txHash;
}

// Backward compatibility alias
export async function sendUsdcTransfer(accountId: string, amountUsd: number): Promise<string> {
  return sendCryptoDeposit(accountId, amountUsd, "base", "token");
}

export async function signTopupConfirmation(accountId: string, txHash: string): Promise<string> {
  const provider = getProvider();
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  const from = accounts[0];
  if (!from) throw new Error("No wallet account available");

  const message = `Qerin top-up confirmation\naccount:${accountId}\ntx:${txHash}`;
  return (await provider.request({
    method: "personal_sign",
    params: [stringToHex(message), from],
  })) as string;
}
