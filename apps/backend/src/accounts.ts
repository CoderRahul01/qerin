import { getSql } from "./db.js";

export async function createAccount(): Promise<string> {
  const sql = getSql();
  const rows = await sql`INSERT INTO users DEFAULT VALUES RETURNING id`;
  return rows[0].id as string;
}

export async function getBalance(accountId: string): Promise<number | null> {
  const sql = getSql();
  const rows = await sql`SELECT balance_usdc FROM users WHERE id = ${accountId}`;
  if (rows.length === 0) return null;
  return Number(rows[0].balance_usdc);
}

/**
 * Atomically deducts `amountUsd` from the account's balance. Returns the
 * new balance, or null if the account doesn't exist or doesn't have
 * enough — the WHERE clause makes this a single round-trip
 * check-and-deduct with no race window between reading and writing.
 */
export async function debitBalance(accountId: string, amountUsd: number): Promise<number | null> {
  const sql = getSql();
  const rows = await sql`
    UPDATE users
    SET balance_usdc = balance_usdc - ${amountUsd}
    WHERE id = ${accountId} AND balance_usdc >= ${amountUsd}
    RETURNING balance_usdc
  `;
  if (rows.length === 0) return null;
  return Number(rows[0].balance_usdc);
}

/**
 * Mirror of debitBalance for refunds — used when an answer request fails
 * after the debit already ran (spend limit hit, no sources responded).
 */
export async function creditBalance(accountId: string, amountUsd: number): Promise<number | null> {
  const sql = getSql();
  const rows = await sql`
    UPDATE users
    SET balance_usdc = balance_usdc + ${amountUsd}
    WHERE id = ${accountId}
    RETURNING balance_usdc
  `;
  if (rows.length === 0) return null;
  return Number(rows[0].balance_usdc);
}

/**
 * Records a completed top-up and credits the balance in one transaction,
 * keyed on the Coinbase Onramp transaction id so re-syncing the same
 * transaction (polling is not exactly-once) never double-credits.
 */
export async function recordDeposit(
  accountId: string,
  onrampTxId: string,
  amountUsd: number
): Promise<{ credited: boolean; balance: number }> {
  const sql = getSql();
  const rows = await sql`
    WITH inserted AS (
      INSERT INTO deposits (user_id, onramp_tx_id, amount_usdc)
      VALUES (${accountId}, ${onrampTxId}, ${amountUsd})
      ON CONFLICT (onramp_tx_id) DO NOTHING
      RETURNING id
    )
    UPDATE users
    SET balance_usdc = balance_usdc + ${amountUsd} * (SELECT COUNT(*) FROM inserted)
    WHERE id = ${accountId}
    RETURNING balance_usdc, (SELECT COUNT(*) FROM inserted) AS inserted_count
  `;
  if (rows.length === 0) {
    // Account row is missing entirely — shouldn't happen since accountId
    // comes from createAccount, but report as not credited rather than throw.
    return { credited: false, balance: 0 };
  }
  const insertedCount = Number(rows[0].inserted_count);
  return { credited: insertedCount > 0, balance: Number(rows[0].balance_usdc) };
}
