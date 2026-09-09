const STORAGE_KEY = "qerin_account_id";

export async function getOrCreateAccountId(): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("getOrCreateAccountId can only run in the browser");
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
  let targetId = accountId;
  if (!targetId || targetId.startsWith("local-")) {
    targetId = await getOrCreateAccountId();
  }

  const res = await fetch("/api/account/topup/demo-claim", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Qerin-Account-Id": targetId },
  });
  const json = await res.json();

  if (res.ok && typeof json.balance === "number") {
    return json.balance as number;
  }

  // Self-heal: If account was not found, mint a brand new account and claim
  if (json?.error === "Unknown account" || res.status === 404) {
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
    const freshId = await getOrCreateAccountId();
    const retry = await fetch("/api/account/topup/demo-claim", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Qerin-Account-Id": freshId },
    });
    const retryJson = await retry.json();
    if (retry.ok && typeof retryJson.balance === "number") {
      return retryJson.balance as number;
    }
  }

  throw new Error(json?.error || "Could not activate ecosystem review pass");
}

export async function claimVoucherFuel(accountId: string, amountUsd: number): Promise<number> {
  let targetId = accountId;
  if (!targetId || targetId.startsWith("local-")) {
    targetId = await getOrCreateAccountId();
  }

  const res = await fetch("/api/account/topup/voucher", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Qerin-Account-Id": targetId },
    body: JSON.stringify({ amountUsd }),
  });
  const json = await res.json();

  if (res.ok && typeof json.balance === "number") {
    return json.balance as number;
  }

  // Self-heal on unknown account
  if (json?.error === "Unknown account" || res.status === 404) {
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
    const freshId = await getOrCreateAccountId();
    const retry = await fetch("/api/account/topup/voucher", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Qerin-Account-Id": freshId },
      body: JSON.stringify({ amountUsd }),
    });
    const retryJson = await retry.json();
    if (retry.ok && typeof retryJson.balance === "number") {
      return retryJson.balance as number;
    }
  }

  throw new Error(json?.error || "Could not credit voucher");
}
