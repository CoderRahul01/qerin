import { getDb, FieldValue } from "./db.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: unknown): email is string {
  return typeof email === "string" && EMAIL_RE.test(email);
}

/**
 * Idempotent on email — uses the email address as the Firestore document ID,
 * so a duplicate submission is a no-op: the doc already exists, the write
 * is skipped, and joined:false is returned (mirrors the Neon ON CONFLICT pattern).
 */
export async function joinWaitlist(email: string): Promise<{ joined: boolean }> {
  const db = getDb();
  const ref = db.collection("waitlist").doc(email);
  const doc = await ref.get();

  if (doc.exists) {
    return { joined: false };
  }

  await ref.set({ email, createdAt: FieldValue.serverTimestamp() });
  return { joined: true };
}
