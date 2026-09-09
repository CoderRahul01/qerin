const STORAGE_KEY = "qerin_account_id";

// The account id is a random UUID minted client-side and never sent
// anywhere except Qerin's own backend — it doubles as a bearer secret
// (same trust model as an API key). No email/password, no recovery flow
// yet: clearing browser storage loses access to the balance.
export async function getOrCreateAccountId(): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("getOrCreateAccountId can only run in the browser");
  }

  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;

  const res = await fetch("/api/account", { method: "POST" });
  const json = await res.json();
  if (!res.ok || !json.accountId) {
    throw new Error(json?.error || "Could not create an account");
  }

  window.localStorage.setItem(STORAGE_KEY, json.accountId);
  return json.accountId as string;
}

export async function fetchBalance(accountId: string): Promise<number> {
  const res = await fetch("/api/account/balance", {
    headers: { "X-Qerin-Account-Id": accountId },
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || "Could not fetch balance");
  }
  return json.balance as number;
}

export async function confirmCryptoTopup(
  accountId: string,
  txHash: string,
  signature: string
): Promise<number> {
  const res = await fetch("/api/account/topup/crypto-confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Qerin-Account-Id": accountId },
    body: JSON.stringify({ txHash, signature }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || "Could not confirm top-up");
  }
  return json.balance as number;
}

export async function claimDemoFuel(accountId: string): Promise<number> {
  const res = await fetch("/api/account/topup/demo-claim", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Qerin-Account-Id": accountId },
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || "Could not activate ecosystem review pass");
  }
  return json.balance as number;
}

