import { selectSources } from "./selectSources.js";
import { estimateCost, gatherSources, type OnProgress } from "./orchestrator.js";
import { synthesizeAnswer } from "./synthesize.js";
import { checkSpendLimit, recordSpend, markSpendDelivered, ANSWER_PRICE_USD } from "./spendGuard.js";
import { getNetwork, getRegistryAddress } from "./networks.js";
import { recordReceiptOnChain } from "./recordReceipt.js";
import { archivePaidDelivery } from "./chatHistory.js";
import { payerAddress, type AgentPayer } from "./agentPayer.js";
import { collectServiceFee } from "./qerinWallet.js";
import { QERIN_SERVICE_FEE_USD, recordAgentSpend, type AgentActivity } from "./agentPolicy.js";
import { getRailByCaip2 } from "./rails.js";

export type { OnProgress } from "./orchestrator.js";

export interface AnswerResult {
  status: 200 | 429 | 502;
  body: Record<string, unknown>;
}

// The research pipeline the Qerin agent runs for one user's question.
// `payer` decides whose money moves:
//   - kind "agent": the user's own Qerin wallet on one rail pays every
//     source, then Qerin's service fee (plus any fee still owed) once the
//     answer is safely delivered. Policy limits are enforced by the route
//     before this runs (agentPolicy.ts).
//   - kind "legacy": prepaid credit from before personal wallets; index.ts
//     owns the ledger debit/refund around this call.
export async function answerHandler(
  question: string,
  accountId: string | null,
  targetNetwork: string | undefined,
  onProgress: OnProgress | undefined,
  chatVaultId: string | null,
  keepBackgroundAlive: ((task: Promise<unknown>) => void) | undefined,
  payer: AgentPayer,
  feeOwedUsd = 0
): Promise<AnswerResult> {
  const sourceKeys = selectSources(question);
  const estimatedCost = estimateCost(sourceKeys);
  const isAgent = payer.kind === "agent";

  if (!isAgent && !(await checkSpendLimit(estimatedCost, accountId))) {
    return {
      status: 429,
      body: {
        error: "Spend limit exceeded",
        message: "Qerin's spend cap for this question or today has been reached. No charge was made.",
      },
    };
  }

  const gatheredResults = await gatherSources(question, sourceKeys, targetNetwork, onProgress, payer);
  const paidResults = gatheredResults.filter((result) => result.settlement === "x402");

  if (paidResults.length === 0) {
    return {
      status: 502,
      body: {
        error: "No verifiable paid settlement",
        message: "Qerin could not complete a verifiable x402 payment to a paid source. Your query was not charged.",
      },
    };
  }

  const totalPaidNum = paidResults.reduce((sum, r) => sum + parseFloat(r.amountPaid || "0"), 0);
  const feeDueUsd = isAgent ? Math.round((QERIN_SERVICE_FEE_USD + feeOwedUsd) * 1e6) / 1e6 : 0;
  const spendLogId = await recordSpend(
    totalPaidNum,
    paidResults.length,
    accountId,
    isAgent ? totalPaidNum + feeDueUsd : accountId ? ANSWER_PRICE_USD : null,
    !isAgent
  );

  onProgress?.({ type: "synthesizing" });
  const synthesized = await synthesizeAnswer(question, gatheredResults);

  const network = getNetwork(targetNetwork);
  // Sources settle on the paying wallet's rail (Base or Solana). The
  // user-selected network only controls where the Qerin receipt registry
  // entry is written, which may be a different chain entirely.
  const registryAddr = getRegistryAddress(targetNetwork);
  const receipt = paidResults.map((r) => {
    const rail = (r.network && getRailByCaip2(r.network)) || payer.rail;
    return {
      source: r.sourceName,
      amountPaid: r.amountPaid,
      txHash: r.txHash,
      basescanUrl: r.txHash ? rail.explorerTxUrl(r.txHash) : null,
      settlementNetwork: rail.name,
      timestamp: r.timestamp,
      content: r.content,
      settlement: r.settlement,
    };
  });

  const answerBody: Record<string, unknown> = {
    question,
    topic: synthesized.topic,
    summary: synthesized.summary,
    answer: synthesized.answer,
    personaInsights: synthesized.personaInsights,
    sourceCitations: synthesized.sourceCitations || [],
    receipt,
    totalPaid: totalPaidNum.toFixed(3),
    network: network.name,
    chainId: network.chainId,
    paidFrom: { address: payerAddress(payer), rail: payer.rail.id, railName: payer.rail.name, personal: isAgent },
  };

  // A charge is only considered deliverable when its answer has been safely
  // archived. If this write fails, the caller's existing route-level refund
  // path runs rather than reporting a paid success that cannot be recovered.
  const deliveryId = await archivePaidDelivery(chatVaultId, answerBody);
  if (deliveryId) answerBody.deliveryId = deliveryId;
  await markSpendDelivered(spendLogId);

  // The answer is delivered, so Qerin's fee is now earned. It moves from the
  // user's wallet to Qerin's treasury through the facilitator (gasless for
  // the user). If it can't settle right now the answer still ships and the
  // fee is carried as owed, collected with the user's next question.
  if (payer.kind === "agent" && accountId) {
    const now = new Date().toISOString();
    const activity: AgentActivity[] = paidResults.map((r) => ({
      kind: "source",
      label: r.sourceName,
      amountUsd: Number(r.amountPaid) || 0,
      rail: payer.rail.id,
      txHash: r.txHash,
      explorerUrl: r.txHash ? payer.rail.explorerTxUrl(r.txHash) : null,
      at: r.timestamp,
    }));
    let feeOwedDelta = 0;
    try {
      const fee = await collectServiceFee(payer, feeDueUsd);
      const explorerUrl = payer.rail.explorerTxUrl(fee.txHash);
      activity.unshift({ kind: "fee", label: "Qerin service fee", amountUsd: feeDueUsd, rail: payer.rail.id, txHash: fee.txHash, explorerUrl, at: now });
      answerBody.serviceFee = { amount: feeDueUsd.toFixed(3), txHash: fee.txHash, explorerUrl, status: "settled" };
      feeOwedDelta = -feeOwedUsd;
    } catch (err) {
      console.error("Service fee collection failed; carrying it as owed:", err);
      answerBody.serviceFee = { amount: feeDueUsd.toFixed(3), txHash: null, explorerUrl: null, status: "owed" };
      feeOwedDelta = QERIN_SERVICE_FEE_USD;
    }
    answerBody.totalCharged = (totalPaidNum + (feeOwedDelta > 0 ? 0 : feeDueUsd)).toFixed(3);
    await recordAgentSpend(accountId, activity, feeOwedDelta).catch((err) => console.error("Could not record agent activity:", err));
  }

  // Record verified on-chain receipt ASAP — but don't block the response on it.
  // The blockchain write (Base/BOT Chain) involves RPC round-trips and tx propagation
  // that can take 5-30s: waiting for it before returning the answer is the single
  // largest source of perceived latency. Fire it as a background task and ship the
  // answer immediately. The receipt will land on-chain regardless.
  // Background the chain write — intentionally not awaited
  let backgroundReceiptPromise: Promise<string | null>;
  try {
    backgroundReceiptPromise = recordReceiptOnChain(question, paidResults.length, totalPaidNum, accountId, targetNetwork);
    // Attach a no-op catch so unhandled-rejection warnings don't fire
    backgroundReceiptPromise.catch((err) => console.error("QerinReceiptRegistry background write failed:", err));
    keepBackgroundAlive?.(backgroundReceiptPromise);
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

  return {
    status: 200,
    body: {
      ...answerBody,
      registryTxHash,
      registryContract: registryAddr,
      registryExplorerUrl: defaultExplorerUrl,
    },
  };
}
