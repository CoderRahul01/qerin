import { isAddress, stringToHex } from "viem";

const STORAGE_KEY = "qerin_account_id";
const ACCOUNT_PROOF_PREFIX = "qerin_account_proof_";

export async function getAccountProof(accountId: string): Promise<string> {
  if (!isAddress(accountId)) throw new Error("Connect your wallet to use its Qerin balance.");
  const key = `${ACCOUNT_PROOF_PREFIX}${accountId.toLowerCase()}`;
  const cached = window.sessionStorage.getItem(key);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as { expiresAt: string };
      if (Date.parse(parsed.expiresAt) > Date.now() + 60_000) return cached;
    } catch {}
  }
  const provider = getProvider();
  const accounts = await provider.request({ method: "eth_accounts" }) as string[];
  const wallet = accounts?.[0];
  if (!wallet || wallet.toLowerCase() !== accountId.toLowerCase()) {
    throw new Error("Connect the wallet that owns this Qerin balance.");
  }
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
  const message = `Qerin account access\nDomain:qerin.vercel.app\nAccount:${accountId.toLowerCase()}\nExpires:${expiresAt}`;
  const signature = await provider.request({ method: "personal_sign", params: [stringToHex(message), wallet] }) as string;
  const proof = JSON.stringify({ expiresAt, signature });
  window.sessionStorage.setItem(key, proof);
  return proof;
}

// ── Multi-Wallet Provider Resolution ────────────────────────────────────────
// Supports MetaMask, OKX Wallet, Bitget Wallet, TokenPocket, and any standard
// EIP-1193 injected provider. Resolves across single-extension and
// multi-extension environments (window.ethereum.providers[]).

export interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  providers?: EthereumProvider[];
  isMetaMask?: boolean;
  isOKExWallet?: boolean;
  isBitKeep?: boolean;
  isTokenPocket?: boolean;
}

// WalletConnect is an EIP-1193 provider just like an injected extension.
// Keeping it behind this module means the payment, signature, and receipt
// code can work identically for BO Wallet QR sessions and browser wallets.
let walletConnectProvider: EthereumProvider | null = null;

// A Reown project ID is a public client identifier, not a wallet secret. The
// environment variable lets deployments use their own project; this fallback
// is Qerin's project registered for the production domain.
const REOWN_PROJECT_ID = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || "beccbc473190c8b06eb5471223604fdf";

export function hasWalletConnect(): boolean {
  return Boolean(REOWN_PROJECT_ID);
}

// Fired whenever the active wallet changes outside a direct user action
// (a QR session restored after reload, or disconnected from the phone), so
// screens holding wallet state can re-read it.
export const WALLET_CHANGED_EVENT = "qerin:wallet-changed";

function notifyWalletChanged(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(WALLET_CHANGED_EVENT));
}

interface WalletConnectSessionProvider extends EthereumProvider {
  connect: (opts?: { optionalChains?: number[] }) => Promise<void>;
  session?: unknown;
  accounts: string[];
}

// One client per page: initialising WalletConnect twice opens two relay
// connections that fight over the same stored session.
let walletConnectInit: Promise<WalletConnectSessionProvider> | null = null;

function initWalletConnect(): Promise<WalletConnectSessionProvider> {
  if (!walletConnectInit) {
    walletConnectInit = (async () => {
      // This package accesses browser APIs at import time, so keep it dynamic
      // for Next.js SSR. BO Wallet scans the modal's WalletConnect URI.
      const { EthereumProvider: WalletConnectProvider } = await import("@walletconnect/ethereum-provider");
      const provider = await WalletConnectProvider.init({
        projectId: REOWN_PROJECT_ID,
        optionalChains: [677, 8453],
        showQrModal: true,
        rpcMap: {
          677: "https://rpc.botchain.ai",
          8453: "https://mainnet.base.org",
        },
        metadata: {
          name: "Qerin",
          description: "Verifiable on-chain research payments",
          url: "https://qerin.vercel.app",
          icons: ["https://qerin.vercel.app/qerin-app-icon-1024.png"],
        },
      });
      provider.on("disconnect", () => {
        walletConnectProvider = null;
        notifyWalletChanged();
      });
      provider.on("accountsChanged", () => notifyWalletChanged());
      return provider as unknown as WalletConnectSessionProvider;
    })().catch((err) => {
      walletConnectInit = null;
      throw err;
    });
  }
  return walletConnectInit;
}

/** Open the WalletConnect QR modal (BO Wallet or any WalletConnect wallet)
 * and retain its EIP-1193 provider as the active signer. */
export async function connectWalletConnect(): Promise<string | null> {
  if (typeof window === "undefined") throw new Error("WalletConnect is only available in the browser.");
  if (!REOWN_PROJECT_ID) throw new Error("WalletConnect is not configured for this deployment.");

  const provider = await initWalletConnect();
  if (!provider.session) await provider.connect({ optionalChains: [677, 8453] });
  walletConnectProvider = provider;
  const accounts = (await provider.request({ method: "eth_accounts" })) as string[];
  const wallet = accounts?.[0];
  return wallet?.startsWith("0x") ? wallet.toLowerCase() : null;
}

/**
 * Re-attach a QR session that survived a page reload. WalletConnect keeps the
 * session in localStorage, but the provider object is gone after a refresh —
 * without this the user looks connected yet can't sign anything. Skipped
 * entirely (no library download) for visitors who never used the QR flow.
 */
async function restoreWalletConnect(): Promise<void> {
  if (walletConnectProvider || typeof window === "undefined" || !REOWN_PROJECT_ID) return;
  let hasStoredSession = false;
  try {
    // The exact key carries WalletConnect's storage version, so match by shape.
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i) ?? "";
      if (!key.startsWith("wc@2:client") || !key.endsWith("session")) continue;
      const stored = window.localStorage.getItem(key);
      if (stored && stored !== "[]") hasStoredSession = true;
    }
  } catch {}
  if (!hasStoredSession) return;
  try {
    const provider = await initWalletConnect();
    if (provider.session && provider.accounts.length > 0) walletConnectProvider = provider;
  } catch {}
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
    okxwallet?: EthereumProvider;
    bitkeep?: { ethereum?: EthereumProvider };
    tokenpocket?: { ethereum?: EthereumProvider };
  }
}

/**
 * Returns the best available EIP-1193 provider, checking:
 * 1. window.okxwallet        (OKX Wallet native injection)
 * 2. window.bitkeep.ethereum (Bitget Wallet)
 * 3. window.tokenpocket.ethereum (TokenPocket)
 * 4. window.ethereum.providers[] (multi-extension: prefer MetaMask, fallback first)
 * 5. window.ethereum          (standard single extension)
 * Returns null if no wallet is available.
 */
export function getInjectedProvider(): EthereumProvider | null {
  if (typeof window === "undefined") return null;

  // OKX Wallet injects its own global
  if (window.okxwallet) return window.okxwallet;

  // Bitget Wallet
  if (window.bitkeep?.ethereum) return window.bitkeep.ethereum;

  // TokenPocket
  if (window.tokenpocket?.ethereum) return window.tokenpocket.ethereum;

  if (!window.ethereum) return null;

  // Multi-extension environment: window.ethereum.providers is an array
  if (Array.isArray(window.ethereum.providers) && window.ethereum.providers.length > 0) {
    // Prefer MetaMask; fall back to the first available provider
    const metamask = window.ethereum.providers.find((p) => p.isMetaMask && !p.isOKExWallet);
    return metamask ?? window.ethereum.providers[0];
  }

  return window.ethereum;
}

/** True when a wallet can sign right now — a browser extension or a live QR session. */
export function hasActiveWallet(): boolean {
  return walletConnectProvider !== null || getInjectedProvider() !== null;
}

export function getProvider(): EthereumProvider {
  const provider = walletConnectProvider ?? getInjectedProvider();
  if (!provider) {
    throw new Error(
      "No wallet found. Connect BO Wallet by QR, install a browser wallet, or open Qerin in your wallet's DApp browser."
    );
  }
  return provider;
}

// ── Wallet Connection ────────────────────────────────────────────────────────

export async function getConnectedWalletAddress(): Promise<string | null> {
  await restoreWalletConnect();
  const provider = walletConnectProvider ?? getInjectedProvider();
  if (!provider) return null;
  try {
    const accounts = (await provider.request({ method: "eth_accounts" })) as string[];
    if (Array.isArray(accounts) && accounts.length > 0 && accounts[0].startsWith("0x")) {
      return accounts[0].toLowerCase();
    }
  } catch {}
  return null;
}

export async function requestWalletConnection(): Promise<string | null> {
  const provider = walletConnectProvider ?? getInjectedProvider();
  // No browser wallet on this device: go straight to the QR flow instead of
  // failing, so one Connect button works for extension and mobile wallets.
  if (!provider) return connectWalletConnect();
  try {
    const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
    if (Array.isArray(accounts) && accounts.length > 0 && accounts[0].startsWith("0x")) {
      return accounts[0].toLowerCase();
    }
    return null;
  } catch (err) {
    // User rejected
    const code = (err as { code?: number })?.code;
    if (code === 4001) throw new Error("Wallet connection was rejected. Please approve the connection request.");
    throw err;
  }
}

// ── Account Identity ─────────────────────────────────────────────────────────

export async function getOrCreateAccountId(walletAddr?: string | null): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("getOrCreateAccountId can only run in the browser");
  }

  const targetWallet = walletAddr !== undefined ? walletAddr : (await getConnectedWalletAddress());
  if (targetWallet && targetWallet.startsWith("0x")) {
    const normalized = targetWallet.toLowerCase();
    window.localStorage.setItem(STORAGE_KEY, normalized);
    try {
      await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: normalized }),
      });
    } catch {}
    return normalized;
  }

  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing && existing.length >= 10 && !existing.startsWith("local-")) {
    return existing;
  }

  try {
    const res = await fetch("/api/account", { method: "POST" });
    const json = await res.json();
    if (res.ok && json.accountId) {
      window.localStorage.setItem(STORAGE_KEY, json.accountId);
      return json.accountId as string;
    }
  } catch {}

  // Fallback to minted random UUID
  const localId = crypto.randomUUID();
  window.localStorage.setItem(STORAGE_KEY, localId);
  return localId;
}

// ── Balance & Account Info ────────────────────────────────────────────────────

export async function fetchBalance(accountId: string): Promise<number> {
  try {
    const res = await fetch("/api/account/balance", {
      headers: { "X-Qerin-Account-Id": accountId },
    });
    const json = await res.json();
    if (res.ok && typeof json.balance === "number") {
      return json.balance as number;
    }

    // If account was missing or unknown, mint fresh account
    if (json?.error === "Unknown account" || res.status === 404) {
      if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
      const newId = await getOrCreateAccountId();
      const retryRes = await fetch("/api/account/balance", {
        headers: { "X-Qerin-Account-Id": newId },
      });
      const retryJson = await retryRes.json();
      return typeof retryJson.balance === "number" ? retryJson.balance : 0;
    }
  } catch {}

  return 0;
}

export async function confirmCryptoTopup(
  accountId: string,
  txHash: string,
  signature: string,
  network?: string,
  walletPublicKey?: string
): Promise<number> {
  const res = await fetch("/api/account/topup/crypto-confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Qerin-Account-Id": accountId },
    body: JSON.stringify({ txHash, signature, network, walletPublicKey }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || "Could not confirm top-up");
  }
  return json.balance as number;
}
