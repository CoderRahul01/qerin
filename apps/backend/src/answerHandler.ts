import { selectSources } from "./selectSources.js";
import { estimateCost, gatherSources, type OnProgress } from "./orchestrator.js";
import { synthesizeAnswer } from "./synthesize.js";
import { checkSpendLimit, recordSpend, ANSWER_PRICE_USD } from "./spendGuard.js";
import { getNetwork, getRegistryAddress } from "./networks.js";
import { recordReceiptOnChain } from "./recordReceipt.js";

export type { OnProgress } from "./orchestrator.js";

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
  targetNetwork?: string,
  onProgress?: OnProgress
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

  const paidResults = await gatherSources(question, sourceKeys, targetNetwork, onProgress);

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

  onProgress?.({ type: "synthesizing" });
  const synthesized = await synthesizeAnswer(question, paidResults);

  // Record verified on-chain receipt ASAP — but don't block the response on it.
  // The blockchain write (Base/BOT Chain) involves RPC round-trips and tx propagation
  // that can take 5-30s: waiting for it before returning the answer is the single
  // largest source of perceived latency. Fire it as a background task and ship the
  // answer immediately. The receipt will land on-chain regardless.
  const network = getNetwork(targetNetwork);
  const registryAddr = getRegistryAddress(targetNetwork);

  // Background the chain write — intentionally not awaited
  let backgroundReceiptPromise: Promise<string | null>;
  try {
    backgroundReceiptPromise = recordReceiptOnChain(question, paidResults.length, totalPaidNum, accountId, targetNetwork);
    // Attach a no-op catch so unhandled-rejection warnings don't fire
    backgroundReceiptPromise.catch((err) => console.error("QerinReceiptRegistry background write failed:", err));
  } catch (err) {
    console.error("QerinReceiptRegistry launch failed:", err);
    backgroundReceiptPromise = Promise.resolve(null);
  }

  // Give the chain write a tiny head-start window (250ms) — often enough for
  // the RPC submit to return a hash, which we can include in the response. If
  // it hasn't resolved by then we ship the answer anyway with txHash = null.
  const registryTxHash = await Promise.race([
    backgroundReceiptPromise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 250)),
  ]);

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
