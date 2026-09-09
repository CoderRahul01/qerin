import { randomBytes, createHash } from "node:crypto";
import { getDb, FieldValue } from "./db.js";

const KEY_PREFIX_LEN = 14;

function hashKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

// Collection: apiKeys/{keyHash}
//   fields: { keyHash, keyPrefix, label, createdAt, revokedAt? }

export async function issueApiKey(label?: string): Promise<{ apiKey: string; prefix: string }> {
  const rawKey = `qk_live_${randomBytes(24).toString("hex")}`;
  const keyHash = hashKey(rawKey);
  const prefix = rawKey.slice(0, KEY_PREFIX_LEN);

  const db = getDb();
  await db.collection("apiKeys").doc(keyHash).set({
    keyHash,
    keyPrefix: prefix,
    label: label ?? null,
    createdAt: FieldValue.serverTimestamp(),
  });

  // rawKey is shown to the caller exactly once — only the hash is persisted.
  return { apiKey: rawKey, prefix };
}

export interface AuthorizedKey {
  id: string;
}

export async function authenticateApiKey(rawKey: string): Promise<AuthorizedKey | null> {
  const keyHash = hashKey(rawKey);
  const db = getDb();
  const doc = await db.collection("apiKeys").doc(keyHash).get();
  if (!doc.exists || doc.data()?.revokedAt) return null;
  return { id: keyHash };
}
