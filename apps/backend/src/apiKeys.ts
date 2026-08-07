import { randomBytes, createHash } from "node:crypto";
import { getSql } from "./db.js";

const KEY_PREFIX_LEN = 14;

function hashKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export async function issueApiKey(label?: string): Promise<{ apiKey: string; prefix: string }> {
  const rawKey = `qk_live_${randomBytes(24).toString("hex")}`;
  const keyHash = hashKey(rawKey);
  const prefix = rawKey.slice(0, KEY_PREFIX_LEN);

  const sql = getSql();
  await sql`
    INSERT INTO api_keys (key_hash, key_prefix, label)
    VALUES (${keyHash}, ${prefix}, ${label ?? null})
  `;

  // rawKey is shown to the caller exactly once here — only the hash is ever
  // persisted, so it cannot be recovered later if lost.
  return { apiKey: rawKey, prefix };
}

export interface AuthorizedKey {
  id: number;
}

export async function authenticateApiKey(rawKey: string): Promise<AuthorizedKey | null> {
  const keyHash = hashKey(rawKey);
  const sql = getSql();
  const rows = await sql`
    SELECT id FROM api_keys WHERE key_hash = ${keyHash} AND revoked_at IS NULL
  `;
  if (rows.length === 0) return null;
  return { id: rows[0].id as number };
}
