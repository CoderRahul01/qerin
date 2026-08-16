import { encodeFunctionData, parseUnits, stringToHex } from "viem";

const BASE_CHAIN_ID_HEX = "0x2105"; // 8453
const PENDING_KEY_PREFIX = "qerin_pending_topup_";

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

function getProvider(): EthereumProvider {
  if (!window.ethereum) {
    throw new Error("No wallet found — install Coinbase Wallet, MetaMask, or open this in a wallet browser.");
  }
  return window.ethereum;
}

async function ensureBaseNetwork(provider: EthereumProvider): Promise<void> {
  const chainId = await provider.request({ method: "eth_chainId" });
  if (chainId === BASE_CHAIN_ID_HEX) return;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BASE_CHAIN_ID_HEX }],
    });
  } catch (err) {
    // 4902 = chain not added to the wallet yet — add it, then the user is
    // already on it (most wallets switch automatically after adding).
    if ((err as { code?: number })?.code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: BASE_CHAIN_ID_HEX,
            chainName: "Base",
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://mainnet.base.org"],
            blockExplorerUrls: ["https://basescan.org"],
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

// --- Pending-payment recovery record --------------------------------------
// Written the instant a transfer is broadcast, cleared only once the
// backend has actually credited it. If the user rejects/loses the
// signature step, closes the tab, or anything else fails after the money
// has already moved, this is how the app can find that transaction again
// on the next visit instead of the payment silently vanishing.

export interface PendingTopup {
  txHash: string;
  amountUsd: number;
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

function savePendingTopup(accountId: string, record: PendingTopup): void {
  window.localStorage.setItem(pendingKey(accountId), JSON.stringify(record));
}

export function clearPendingTopup(accountId: string): void {
  window.localStorage.removeItem(pendingKey(accountId));
}

// --- Wallet flow ------------------------------------------------------------

/**
 * Connects the user's injected wallet and sends amountUsd worth of USDC to
 * Qerin's wallet on Base. The txHash is persisted to localStorage the
 * instant this resolves — before any signature is requested — so a
 * transfer that already happened is never lost even if the next step
 * (signMessageForTopup) fails.
 */
export async function sendUsdcTransfer(accountId: string, amountUsd: number): Promise<string> {
  const provider = getProvider();

  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  const from = accounts[0];
  if (!from) throw new Error("No wallet account available");

  await ensureBaseNetwork(provider);

  const infoRes = await fetch("/api/network-info");
  const info = await infoRes.json();
  if (!infoRes.ok || !info.payTo || !info.usdc) {
    throw new Error(info?.error || "Could not load network info");
  }

  const amountAtomic = parseUnits(amountUsd.toString(), 6);
  const data = encodeFunctionData({
    abi: ERC20_TRANSFER_ABI,
    functionName: "transfer",
    args: [info.payTo as `0x${string}`, amountAtomic],
  });

  const txHash = (await provider.request({
    method: "eth_sendTransaction",
    params: [{ from, to: info.usdc, data }],
  })) as string;

  // Money has moved — record it before doing anything else that could fail.
  savePendingTopup(accountId, { txHash, amountUsd, sentAt: Date.now() });

  return txHash;
}

/**
 * Signs the message binding this specific transaction to the account. Can
 * be called again for a persisted pending txHash without re-sending funds
 * — that's the whole point of separating this from sendUsdcTransfer.
 * Must exactly match buildTopupSignMessage on the backend
 * (apps/backend/src/cryptoTopup.ts) — any drift breaks verification.
 */
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
