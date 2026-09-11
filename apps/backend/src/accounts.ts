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
    passClaimed: false,
    createdAt: FieldValue.serverTimestamp(),
  });
  return id;
}

export async function getOrCreateAccount(accountId?: string): Promise<{ accountId: string; balance: number; passClaimed: boolean }> {
  const db = getDb();
  const id = normalizeAccountId(accountId);
  const ref = db.collection("accounts").doc(id);
  const doc = await ref.get();

  if (doc.exists) {
    const data = doc.data()!;
    return {
      accountId: id,
      balance: Number(data.balance ?? 0),
      passClaimed: Boolean(data.passClaimed),
    };
  }

  await ref.set({
    balance: 0,
    passClaimed: false,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { accountId: id, balance: 0, passClaimed: false };
}

/**
 * Atomically claims the one-time Ecosystem Review Pass ($1.50).
 * Enforces that an individual user / account / wallet can ONLY claim it once.
 */
export async function claimEcosystemPass(
  accountId: string,
  amountUsd = 1.50
): Promise<{ success: boolean; balance: number; alreadyClaimed: boolean }> {
  const db = getDb();
  const id = normalizeAccountId(accountId);
  const ref = db.collection("accounts").doc(id);

  return db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists) {
      tx.set(ref, {
        balance: amountUsd,
        passClaimed: true,
        passClaimedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      });
      return { success: true, balance: amountUsd, alreadyClaimed: false };
    }

    const data = doc.data()!;
    const isAlreadyClaimed = Boolean(data.passClaimed);
    const currentBalance = Number(data.balance ?? 0);

    if (isAlreadyClaimed) {
      return { success: false, balance: currentBalance, alreadyClaimed: true };
    }

    const nextBalance = currentBalance + amountUsd;
    tx.update(ref, {
      balance: nextBalance,
      passClaimed: true,
      passClaimedAt: FieldValue.serverTimestamp(),
    });
    return { success: true, balance: nextBalance, alreadyClaimed: false };
  });
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
 * Idempotent by design — keyed GLOBALLY on (network, txHash), not per-account.
 *
 * A per-account key alone is not enough: the signed message that authorizes
 * a deposit binds accountId + txHash, and any client can mint a fresh
 * accountId for free (see normalizeAccountId — falls back to a random UUID
 * when it isn't a wallet address). Without a global lock, the real signer of
 * one on-chain transfer could re-sign the same txHash against many different
 * accountIds and get the same payment credited over and over. The
 * `usedDeposits/{network}:{txHash}` doc is the single source of truth for
 * "has this transaction already been spent," checked in the same
 * transaction as the credit.
 */
export async function recordDeposit(
  accountId: string,
  txHash: string,
  amountUsd: number,
  networkKey: string
): Promise<{ credited: boolean; balance: number; accountFound: boolean; reason?: string }> {
  const db = getDb();
  const id = normalizeAccountId(accountId);
  const accountRef = db.collection("accounts").doc(id);
  const depositRef = accountRef.collection("deposits").doc(txHash);
  const globalTxRef = db.collection("usedDeposits").doc(`${networkKey}:${txHash.toLowerCase()}`);

  return db.runTransaction(async (tx) => {
    const [accountDoc, depositDoc, globalTxDoc] = await Promise.all([
      tx.get(accountRef),
      tx.get(depositRef),
      tx.get(globalTxRef),
    ]);

    if (globalTxDoc.exists) {
      const usedByAccountId = globalTxDoc.data()?.accountId;
      if (usedByAccountId !== id) {
        // Same real transaction, different accountId — replay attempt.
        return {
          credited: false,
          balance: accountDoc.exists ? Number(accountDoc.data()!.balance ?? 0) : 0,
          accountFound: accountDoc.exists,
          reason: "This transaction has already been credited to a different account",
        };
      }
      // Same account retrying — idempotent no-op, matches prior behavior.
      return {
        credited: false,
        balance: accountDoc.exists ? Number(accountDoc.data()!.balance ?? 0) : 0,
        accountFound: accountDoc.exists,
      };
    }

    if (!accountDoc.exists) {
      tx.set(accountRef, { balance: amountUsd, createdAt: FieldValue.serverTimestamp() });
      tx.set(depositRef, { amount: amountUsd, createdAt: FieldValue.serverTimestamp() });
      tx.set(globalTxRef, { accountId: id, amount: amountUsd, createdAt: FieldValue.serverTimestamp() });
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
    tx.set(globalTxRef, { accountId: id, amount: amountUsd, createdAt: FieldValue.serverTimestamp() });
    return { credited: true, balance: next, accountFound: true };
  });
}
