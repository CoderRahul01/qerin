import { selectSources } from "./selectSources.js";
import { estimateCost, gatherSources } from "./orchestrator.js";
import { synthesizeAnswer } from "./synthesize.js";
import { checkSpendLimit, recordSpend, ANSWER_PRICE_USD } from "./spendGuard.js";
import { getNetwork } from "./networks.js";
import { recordReceiptOnChain } from "./recordReceipt.js";

export interface AnswerResult {
  status: 200 | 429 | 502;
  body: Record<string, unknown>;
}

// Shared by both /v1/answer (balance-gated consumer app) and
// /v1/paid/answer (x402-paywalled developer API) in index.ts — the only
// difference between the two routes is how the caller pays. `accountId`
// is passed through to the answer_requests record for attribution when
// called from the balance-gated path; index.ts owns debiting/refunding
// that balance around this call.
export async function answerHandler(
  question: string,
  accountId: string | null = null,
  targetNetwork?: string
): Promise<AnswerResult> {
  const sourceKeys = selectSources(question);
  const estimatedCost = estimateCost(sourceKeys);

  if (!(await checkSpendLimit(estimatedCost))) {
    return {
      status: 429,
      body: {
        error: "Spend limit exceeded",
        message: "Qerin's spend cap for this question or today has been reached. No charge was made.",
      },
    };
  }

  const paidResults = await gatherSources(question, sourceKeys);

  if (paidResults.length === 0) {
    return {
      status: 502,
      body: {
        error: "No sources responded",
        message: "Qerin could not reach any paid source. No charge was made.",
      },
    };
  }

  const totalPaidNum = paidResults.reduce((sum, r) => sum + parseFloat(r.amountPaid || "0"), 0);
  await recordSpend(totalPaidNum, paidResults.length, accountId, accountId ? ANSWER_PRICE_USD : null);

  const synthesized = await synthesizeAnswer(question, paidResults);

  // The summary above is the hook; the full paid content per source is the
  // actual deliverable Qerin sells access to — surface it alongside the
  // receipt rather than discarding it after synthesis.
  const network = getNetwork(targetNetwork);
  const receipt = paidResults.map((r) => ({
    source: r.sourceName,
    amountPaid: r.amountPaid,
    txHash: r.txHash,
    basescanUrl: r.txHash ? network.explorerTxUrl(r.txHash) : null,
    timestamp: r.timestamp,
    content: r.content,
  }));

  // Fire-and-forget: logging to the on-chain registry must never delay or
  // fail a response that's already been paid for.
  void recordReceiptOnChain(question, paidResults.length, totalPaidNum);

  return {
    status: 200,
    body: {
      question,
      topic: synthesized.topic,
      summary: synthesized.summary,
      answer: synthesized.answer,
      personaInsights: synthesized.personaInsights,
      receipt,
      totalPaid: totalPaidNum.toFixed(3),
      network: network.name,
      chainId: network.chainId,
    },
  };
}
