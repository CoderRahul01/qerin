import { isAddress, getAddress } from "viem";
import { getDb, FieldValue } from "./db.js";
import crypto from "crypto";

export function normalizeAccountId(accountId?: string | null): string {
  if (!accountId) return crypto.randomUUID();
  const trimmed = accountId.trim();
  if (isAddress(trimmed)) {
    return getAddress(trimmed).toLowerCase();
  }
  return trimmed;
}

// Collection: accounts/{accountId}
//   fields: { balance: number, createdAt: Timestamp }
//
// Sub-collection: accounts/{accountId}/deposits/{txId}
//   fields: { amount: number, createdAt: Timestamp }

export async function createAccount(): Promise<string> {
  const db = getDb();
  const id = crypto.randomUUID();
  await db.collection("accounts").doc(id).set({
    balance: 0,
    createdAt: FieldValue.serverTimestamp(),
  });
  return id;
}

export async function getOrCreateAccount(accountId?: string): Promise<{ accountId: string; balance: number }> {
  const db = getDb();
  const id = normalizeAccountId(accountId);
  const ref = db.collection("accounts").doc(id);
  const doc = await ref.get();

  if (doc.exists) {
    return { accountId: id, balance: Number(doc.data()!.balance ?? 0) };
  }

  await ref.set({
    balance: 0,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { accountId: id, balance: 0 };
}

export async function getBalance(accountId: string): Promise<number | null> {
  const db = getDb();
  const id = normalizeAccountId(accountId);
  const doc = await db.collection("accounts").doc(id).get();
  if (!doc.exists) return null;
  return Number(doc.data()!.balance ?? 0);
}

/**
 * Atomically deducts `amountUsd` from the account balance.
 * Returns the new balance, or null if the account has insufficient funds.
 */
export async function debitBalance(
  accountId: string,
  amountUsd: number
): Promise<number | null> {
  const db = getDb();
  const id = normalizeAccountId(accountId);
  const ref = db.collection("accounts").doc(id);

  return db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists) return null;
    const current = Number(doc.data()!.balance ?? 0);
    if (current < amountUsd) return null;
    const next = current - amountUsd;
    tx.update(ref, { balance: next });
    return next;
  });
}

/**
 * Atomically credits `amountUsd` to the account balance.
 * If the account doc does not exist yet, creates it on-the-fly.
 */
export async function creditBalance(
  accountId: string,
  amountUsd: number
): Promise<number> {
  const db = getDb();
  const id = normalizeAccountId(accountId);
  const ref = db.collection("accounts").doc(id);

  return db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists) {
      tx.set(ref, { balance: amountUsd, createdAt: FieldValue.serverTimestamp() });
      return amountUsd;
    }
    const current = Number(doc.data()!.balance ?? 0);
    const next = current + amountUsd;
    tx.update(ref, { balance: next });
    return next;
  });
}

/**
 * Records a completed top-up and credits the balance.
 * Idempotent by design — keyed on txHash.
 */
export async function recordDeposit(
  accountId: string,
  txHash: string,
  amountUsd: number
): Promise<{ credited: boolean; balance: number; accountFound: boolean }> {
  const db = getDb();
  const id = normalizeAccountId(accountId);
  const accountRef = db.collection("accounts").doc(id);
  const depositRef = accountRef.collection("deposits").doc(txHash);

  return db.runTransaction(async (tx) => {
    const [accountDoc, depositDoc] = await Promise.all([
      tx.get(accountRef),
      tx.get(depositRef),
    ]);

    if (!accountDoc.exists) {
      tx.set(accountRef, { balance: amountUsd, createdAt: FieldValue.serverTimestamp() });
      tx.set(depositRef, { amount: amountUsd, createdAt: FieldValue.serverTimestamp() });
      return { credited: true, balance: amountUsd, accountFound: true };
    }

    if (depositDoc.exists) {
      return {
        credited: false,
        balance: Number(accountDoc.data()!.balance ?? 0),
        accountFound: true,
      };
    }

    const current = Number(accountDoc.data()!.balance ?? 0);
    const next = current + amountUsd;
    tx.update(accountRef, { balance: next });
    tx.set(depositRef, { amount: amountUsd, createdAt: FieldValue.serverTimestamp() });
    return { credited: true, balance: next, accountFound: true };
  });
}
