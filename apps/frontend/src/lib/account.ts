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

export interface TopupOrder {
  orderId: string;
  amountPaise: number;
  keyId: string;
  amountUsd: number;
}

export async function requestTopup(accountId: string, amountUsd: number): Promise<TopupOrder> {
  const res = await fetch("/api/account/topup", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Qerin-Account-Id": accountId },
    body: JSON.stringify({ amountUsd }),
  });
  const json = await res.json();
  if (!res.ok || !json.orderId) {
    throw new Error(json?.error || "Could not start top-up");
  }
  return json as TopupOrder;
}

export async function confirmTopup(
  accountId: string,
  orderId: string,
  paymentId: string,
  signature: string,
  amountUsd: number
): Promise<number> {
  const res = await fetch("/api/account/topup/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Qerin-Account-Id": accountId },
    body: JSON.stringify({ orderId, paymentId, signature, amountUsd }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || "Could not confirm top-up");
  }
  return json.balance as number;
}
