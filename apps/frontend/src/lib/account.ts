const STORAGE_KEY = "qerin_account_id";

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

export function getProvider(): EthereumProvider {
  const provider = getInjectedProvider();
  if (!provider) {
    throw new Error(
      "No wallet found. Please install MetaMask, OKX Wallet, Bitget Wallet, or TokenPocket, or open in a Web3 browser."
    );
  }
  return provider;
}

// ── Wallet Connection ────────────────────────────────────────────────────────

export async function getConnectedWalletAddress(): Promise<string | null> {
  const provider = getInjectedProvider();
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
  const provider = getInjectedProvider();
  if (!provider) {
    throw new Error(
      "No Web3 wallet detected. Install MetaMask, OKX Wallet, Bitget Wallet, or TokenPocket and refresh."
    );
  }
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

export interface AccountInfo {
  balance: number;
  passClaimed: boolean;
}

export async function fetchAccountInfo(accountId: string): Promise<AccountInfo> {
  try {
    const res = await fetch("/api/account/balance", {
      headers: { "X-Qerin-Account-Id": accountId },
    });
    const json = await res.json();
    if (res.ok && typeof json.balance === "number") {
      return {
        balance: json.balance as number,
        passClaimed: Boolean(json.passClaimed),
      };
    }
  } catch {}
  return { balance: 0, passClaimed: false };
}

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
  network?: string
): Promise<number> {
  const res = await fetch("/api/account/topup/crypto-confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Qerin-Account-Id": accountId },
    body: JSON.stringify({ txHash, signature, network }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || "Could not confirm top-up");
  }
  return json.balance as number;
}

export async function claimDemoFuel(accountId: string, turnstileToken: string): Promise<number> {
  let targetId = accountId;
  if (!targetId || targetId.startsWith("local-")) {
    targetId = await getOrCreateAccountId();
  }

  const res = await fetch("/api/account/topup/demo-claim", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Qerin-Account-Id": targetId },
    body: JSON.stringify({ turnstileToken }),
  });
  const json = await res.json();

  if (res.ok && typeof json.balance === "number") {
    return json.balance as number;
  }

  if (res.status === 409 || json?.alreadyClaimed) {
    throw new Error(json?.error || "Ecosystem Review Pass has already been claimed for this account. Pass is strictly one-time per user.");
  }

  throw new Error(json?.error || "Could not activate ecosystem review pass");
}
