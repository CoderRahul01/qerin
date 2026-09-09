import { getDb, FieldValue, Timestamp } from "./db.js";

const MAX_PER_QUESTION_USDC = 0.5;
const MAX_DAILY_USDC = 5.0;

// $0.15 = $0.07 sources + $0.08 fee, matching DeveloperScreen.tsx's pricing
// breakdown. Both paywalls charge exactly this.
export const QERIN_SERVICE_FEE_USD = 0.08;

// Flat price charged per answer.
export const ANSWER_PRICE_USD = 0.15;

// Collection: spendLog/{autoId}
//   fields: { sourceCostUsd, sourceCount, userId, debitedUsd, createdAt }

export async function checkSpendLimit(estimatedCost: number): Promise<boolean> {
  if (estimatedCost > MAX_PER_QUESTION_USDC) return false;

  const db = getDb();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const snap = await db
    .collection("spendLog")
    .where("createdAt", ">=", Timestamp.fromDate(startOfDay))
    .get();

  const dailySpent = snap.docs.reduce(
    (sum, d) => sum + Number(d.data()?.sourceCostUsd ?? 0),
    0
  );

  return dailySpent + estimatedCost <= MAX_DAILY_USDC;
}

export async function recordSpend(
  sourceCostUsd: number,
  sourceCount: number,
  accountId: string | null = null,
  debitedUsd: number | null = null
): Promise<void> {
  const db = getDb();
  await db.collection("spendLog").add({
    sourceCostUsd,
    sourceCount,
    userId: accountId,
    debitedUsd,
    createdAt: FieldValue.serverTimestamp(),
  });
}
