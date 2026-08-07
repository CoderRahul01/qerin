import { getSql } from "./db.js";

const MAX_PER_QUESTION_USDC = 0.5;
const MAX_DAILY_USDC = 5.0;

// $0.15 = $0.07 sources + $0.08 fee, matching DeveloperScreen.tsx's pricing
// breakdown. Both paywalls charge exactly this: /v1/paid/answer collects it
// via an x402 payment before the handler runs (index.ts), and /v1/answer
// debits it from the caller's prepaid balance (accounts.ts) before the
// handler runs — in both cases the money has already moved by the time
// recordSpend runs here.
export const QERIN_SERVICE_FEE_USD = 0.08;

// Flat price charged per answer — to a developer's wallet via x402 on
// /v1/paid/answer, or from a consumer's prepaid balance on /v1/answer.
// Source cost varies per question (see sources.ts); this margin absorbs
// that variance rather than metering it exactly.
export const ANSWER_PRICE_USD = 0.15;

export async function checkSpendLimit(estimatedCost: number): Promise<boolean> {
  if (estimatedCost > MAX_PER_QUESTION_USDC) return false;

  const sql = getSql();
  const rows = await sql`
    SELECT COALESCE(SUM(source_cost_usd), 0) AS total
    FROM answer_requests
    WHERE created_at >= date_trunc('day', now())
  `;
  const dailySpent = Number(rows[0]?.total ?? 0);

  return dailySpent + estimatedCost <= MAX_DAILY_USDC;
}

export async function recordSpend(
  sourceCostUsd: number,
  sourceCount: number,
  accountId: string | null = null,
  debitedUsd: number | null = null
): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO answer_requests (source_cost_usd, source_count, user_id, debited_usd)
    VALUES (${sourceCostUsd}, ${sourceCount}, ${accountId}, ${debitedUsd})
  `;
}
