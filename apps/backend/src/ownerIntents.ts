import { isAddress, recoverMessageAddress } from "viem";
import { normalizeAccountId } from "./accounts.js";
import { getDb, FieldValue } from "./db.js";

// Owner intents: actions only the wallet owner may take over their Qerin
// wallet — changing the agent's spend policy and withdrawing funds. The
// server writes the exact human-readable message, the owner signs it in
// MetaMask / BO Wallet / Coinbase Wallet (gasless personal_sign), and the
// signed intent is redeemable exactly once before it expires.
//
// The longer-lived "account access" signature (accountProof.ts) is enough to
// let the agent spend within the owner's limits. It is deliberately NOT
// enough to raise those limits or move money out: those need a fresh
// signature over the specific change.

export const INTENT_TTL_MS = 10 * 60 * 1000;

export type IntentKind = "policy" | "withdraw";

export interface OwnerIntent {
  account: string;
  kind: IntentKind;
  params: Record<string, unknown>;
  message: string;
  expiresAt: string;
}

function intentTitle(kind: IntentKind): string {
  return kind === "policy" ? "Qerin agent spend policy" : "Qerin wallet withdrawal";
}

export function buildIntentMessage(
  account: string,
  kind: IntentKind,
  lines: Array<[string, string]>,
  nonce: string,
  expiresAt: string
): string {
  return [
    intentTitle(kind),
    "Domain:qerin.vercel.app",
    `Account:${account.toLowerCase()}`,
    ...lines.map(([label, value]) => `${label}:${value}`),
    `Nonce:${nonce}`,
    `Expires:${expiresAt}`,
  ].join("\n");
}

export async function createOwnerIntent(
  accountId: string,
  kind: IntentKind,
  params: Record<string, unknown>,
  lines: Array<[string, string]>
): Promise<{ nonce: string; message: string; expiresAt: string }> {
  if (!isAddress(accountId)) throw new Error("Owner actions require a connected wallet");
  const account = normalizeAccountId(accountId);
  const nonce = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + INTENT_TTL_MS).toISOString();
  const message = buildIntentMessage(account, kind, lines, nonce, expiresAt);
  await getDb().collection("ownerIntents").doc(nonce).set({
    account,
    kind,
    params,
    message,
    expiresAt,
    used: false,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { nonce, message, expiresAt };
}

/** Pure signature check, separated so it is unit-tested without Firestore. */
export async function isSignedByOwner(account: string, message: string, signature: unknown): Promise<boolean> {
  if (typeof signature !== "string" || !/^0x[0-9a-fA-F]+$/.test(signature) || signature.length > 1024) return false;
  try {
    const signer = await recoverMessageAddress({ message, signature: signature as `0x${string}` });
    return signer.toLowerCase() === account.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Atomically redeems a signed intent. Returns the intent only if it belongs
 * to `accountId`, has the expected kind, is unexpired, unused, and carries the
 * owner's signature over its exact message — and marks it used in the same
 * transaction so it can never be replayed.
 */
export async function redeemOwnerIntent(
  accountId: string,
  kind: IntentKind,
  nonce: unknown,
  signature: unknown
): Promise<OwnerIntent | string> {
  if (typeof nonce !== "string" || !/^[0-9a-f-]{36}$/.test(nonce)) return "This request is invalid. Start again.";
  const account = normalizeAccountId(accountId);
  const db = getDb();
  const ref = db.collection("ownerIntents").doc(nonce);

  return db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const data = doc.exists ? doc.data() : undefined;
    if (!data || data.account !== account || data.kind !== kind) return "This request is invalid. Start again.";
    if (data.used) return "This signature was already used.";
    if (Date.parse(String(data.expiresAt)) <= Date.now()) return "This request expired. Start again.";
    if (!(await isSignedByOwner(account, String(data.message), signature))) {
      return "The signature doesn't match the wallet that owns this Qerin account.";
    }
    tx.update(ref, { used: true, usedAt: FieldValue.serverTimestamp() });
    return {
      account,
      kind,
      params: (data.params ?? {}) as Record<string, unknown>,
      message: String(data.message),
      expiresAt: String(data.expiresAt),
    };
  });
}
