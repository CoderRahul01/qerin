import { selectSources } from "./selectSources.js";
import { estimateCost, gatherSources } from "./orchestrator.js";
import { synthesizeAnswer } from "./synthesize.js";
import { checkSpendLimit, recordSpend, ANSWER_PRICE_USD } from "./spendGuard.js";
import { getNetwork, getRegistryAddress } from "./networks.js";
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

  if (!(await checkSpendLimit(estimatedCost, accountId))) {
    return {
      status: 429,
      body: {
        error: "Spend limit exceeded",
        message: "Qerin's spend cap for this question or today has been reached. No charge was made.",
      },
    };
  }

  const paidResults = await gatherSources(question, sourceKeys, targetNetwork);

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

  // Record verified on-chain receipt directly to the QerinReceiptRegistry smart contract
  const network = getNetwork(targetNetwork);
  const registryAddr = getRegistryAddress(targetNetwork);
  let registryTxHash: string | null = null;
  try {
    registryTxHash = await recordReceiptOnChain(question, paidResults.length, totalPaidNum, accountId, targetNetwork);
  } catch (err) {
    console.error("QerinReceiptRegistry write failed:", err);
  }

  const defaultExplorerUrl = registryTxHash
    ? network.explorerTxUrl(registryTxHash)
    : (registryAddr ? network.explorerAddressUrl(registryAddr) : "https://basescan.org");

  const receipt = paidResults.map((r) => {
    const tx = r.txHash || registryTxHash;
    return {
      source: r.sourceName,
      amountPaid: r.amountPaid,
      txHash: tx,
      basescanUrl: tx ? network.explorerTxUrl(tx) : defaultExplorerUrl,
      timestamp: r.timestamp,
      content: r.content,
    };
  });

  return {
    status: 200,
    body: {
      question,
      topic: synthesized.topic,
      summary: synthesized.summary,
      answer: synthesized.answer,
      personaInsights: synthesized.personaInsights,
      sourceCitations: synthesized.sourceCitations || [],
      receipt,
      registryTxHash,
      registryContract: registryAddr,
      registryExplorerUrl: defaultExplorerUrl,
      totalPaid: totalPaidNum.toFixed(3),
      network: network.name,
      chainId: network.chainId,
    },
  };
}
