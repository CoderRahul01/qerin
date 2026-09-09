import {
  encodeFunctionData,
  parseUnits,
  stringToHex,
  formatUnits,
  formatEther,
  parseEther,
} from "viem";

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

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export function getProvider(): EthereumProvider {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No wallet found — please install MetaMask, Rabby, Coinbase Wallet, or open in a Web3 browser.");
  }
  return window.ethereum;
}

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

// --- Pending-payment recovery record --------------------------------------

export interface PendingTopup {
  txHash: string;
  amountUsd: number;
  network?: TopupNetwork;
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

// --- Wallet Diagnostics & Watch Asset ------------------------------------

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

  return {
    account,
    nativeBalance,
    tokenBalance,
    nativeNumeric,
    tokenNumeric,
  };
}

// --- Wallet flow ------------------------------------------------------------

export async function sendCryptoDeposit(
  accountId: string,
  amountUsd: number,
  network: TopupNetwork = "base",
  paymentMethod: "token" | "native" = "token"
): Promise<string> {
  const provider = getProvider();
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  const from = accounts[0];
  if (!from) throw new Error("No wallet account available");

  await ensureNetwork(provider, network);
  const meta = TOPUP_NETWORKS[network];

  // Fetch destination settlement address
  const infoRes = await fetch(`/api/network-info?network=${network}`);
  const info = await infoRes.json().catch(() => ({}));
  const payTo = (info.payTo || "0x5b2131e9b28a46Ec10D260A14B9DEB34554311F2") as `0x${string}`;

  // Pre-flight balance diagnostics: avoid firing a doomed transaction that causes
  // MetaMask to display "1 Unknown" / "This transaction is likely to fail"
  const diag = await checkWalletBalances(network).catch(() => null);
  if (diag) {
    if (paymentMethod === "token") {
      if (diag.nativeNumeric <= 0.00005) {
        throw new Error(
          `Insufficient gas on ${meta.name}. Your wallet holds ${diag.nativeBalance} ${meta.currency}. A small amount of ${meta.currency} is required to pay network fees. You can also claim the Instant Ecosystem Review Pass below.`
        );
      }
      if (diag.tokenNumeric < amountUsd) {
        throw new Error(
          `Insufficient ${meta.tokenSymbol} balance: Your wallet holds ${diag.tokenBalance} ${meta.tokenSymbol} on ${meta.name} (required: $${amountUsd}.00). Fund your address or activate the Instant Ecosystem Review Pass below.`
        );
      }
    }
  }

  let txHash: string;

  if (paymentMethod === "token") {
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
  } else {
    // Native coin payment (ETH or BOT)
    const weiAmount = network === "base"
      ? parseEther((amountUsd / 2500).toFixed(6))
      : parseEther((amountUsd * 10).toString());

    txHash = (await provider.request({
      method: "eth_sendTransaction",
      params: [{ from, to: payTo, value: `0x${weiAmount.toString(16)}`, data: "0x" }],
    })) as string;
  }

  savePendingTopup(accountId, { txHash, amountUsd, network, sentAt: Date.now() });
  return txHash;
}

// Backward compatibility alias for legacy callers
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
