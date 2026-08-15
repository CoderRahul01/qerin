import { getSql } from "./db.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: unknown): email is string {
  return typeof email === "string" && EMAIL_RE.test(email);
}

/**
 * Idempotent on email — a duplicate submission returns joined: false rather
 * than erroring, mirroring recordDeposit's ON CONFLICT DO NOTHING pattern
 * in accounts.ts.
 */
export async function joinWaitlist(email: string): Promise<{ joined: boolean }> {
  const sql = getSql();
  const rows = await sql`
    INSERT INTO waitlist_signups (email)
    VALUES (${email})
    ON CONFLICT (email) DO NOTHING
    RETURNING id
  `;
  return { joined: rows.length > 0 };
}
