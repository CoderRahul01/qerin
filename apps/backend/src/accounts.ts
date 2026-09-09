import { getDb, FieldValue } from "./db.js";
import crypto from "crypto";

// Collection: accounts/{accountId}
//   fields: { balance: number, createdAt: Timestamp }
//
// Sub-collection: accounts/{accountId}/deposits/{txId}
//   fields: { amount: number, createdAt: Timestamp }
//
// This mirrors the Neon schema 1-to-1 while keeping the free Spark plan limits
// in mind: each question = 1 read (balance) + 1 write (debit) — well within
// 50 k reads / 20 k writes per day.

export async function createAccount(): Promise<string> {
  const db = getDb();
  const id = crypto.randomUUID();
  await db.collection("accounts").doc(id).set({
    balance: 0,
    createdAt: FieldValue.serverTimestamp(),
  });
  return id;
}

export async function getBalance(accountId: string): Promise<number | null> {
  const db = getDb();
  const doc = await db.collection("accounts").doc(accountId).get();
  if (!doc.exists) return null;
  return Number(doc.data()!.balance ?? 0);
}

/**
 * Atomically deducts `amountUsd` from the account balance.
 * Returns the new balance, or null if the account is missing or has
 * insufficient funds. Uses a Firestore transaction so there is no
 * race window between read and write.
 */
export async function debitBalance(
  accountId: string,
  amountUsd: number
): Promise<number | null> {
  const db = getDb();
  const ref = db.collection("accounts").doc(accountId);

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
 * Mirror of debitBalance for refunds — called when an answer request fails
 * after the debit already ran.
 */
export async function creditBalance(
  accountId: string,
  amountUsd: number
): Promise<number | null> {
  const db = getDb();
  const ref = db.collection("accounts").doc(accountId);

  return db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists) return null;
    const current = Number(doc.data()!.balance ?? 0);
    const next = current + amountUsd;
    tx.update(ref, { balance: next });
    return next;
  });
}

/**
 * Records a completed top-up and credits the balance.
 * Keyed on txHash as the Firestore doc ID — idempotent by design
 * (the same tx hash written twice is a no-op because doc already exists).
 */
export async function recordDeposit(
  accountId: string,
  txHash: string,
  amountUsd: number
): Promise<{ credited: boolean; balance: number; accountFound: boolean }> {
  const db = getDb();
  const accountRef = db.collection("accounts").doc(accountId);
  const depositRef = accountRef.collection("deposits").doc(txHash);

  return db.runTransaction(async (tx) => {
    const [accountDoc, depositDoc] = await Promise.all([
      tx.get(accountRef),
      tx.get(depositRef),
    ]);

    if (!accountDoc.exists) {
      return { credited: false, balance: 0, accountFound: false };
    }
    if (depositDoc.exists) {
      // Already credited this tx — idempotent, return current balance.
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
