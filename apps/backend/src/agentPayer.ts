import { x402Client } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { ExactSvmScheme } from "@x402/svm/exact/client";
import type { PaymentRequirements } from "@x402/core/types";
import type { ClientEvmSigner } from "@x402/evm";
import { getAgentWalletSigner } from "./agentWallet.js";
import { getSolanaAgentSigner } from "./solana/agentWallet.js";
import { createQerinCdpFacilitatorClient } from "./cdpFacilitator.js";
import { getQerinAccount } from "./wallet.js";
import { usdToAtomic, type PaymentRail } from "./rails.js";

// The Qerin agent acting for one user on one rail. Everything the agent pays
// — sources, Qerin's service fee, and withdrawals back to the owner — is
// signed by that user's own wallet. `legacy` is the only exception: credit
// bought before personal wallets existed is still spent from Qerin's shared
// wallet, and only while that wallet happens to hold funds (it is never a
// requirement for running research).
export type AgentPayer =
  | { kind: "agent"; owner: string; rail: PaymentRail; walletAddress: string }
  | { kind: "legacy"; rail: PaymentRail };

export function payerAddress(payer: AgentPayer): string {
  return payer.kind === "agent" ? payer.walletAddress : getQerinAccount().address;
}

/** Registers the one scheme able to sign for `payer` on its rail. */
export function registerPayerScheme(client: x402Client, payer: AgentPayer): x402Client {
  const { rail } = payer;
  if (rail.family === "evm") {
    const signer: ClientEvmSigner = payer.kind === "agent"
      ? getAgentWalletSigner(payer.walletAddress as `0x${string}`)
      : getQerinAccount();
    return registerExactEvmScheme(client, { signer, networks: [rail.caip2 as `${string}:${string}`] });
  }
  if (payer.kind !== "agent") throw new Error("Legacy credit can only be spent on Base");
  return client.register(
    rail.caip2 as `${string}:${string}`,
    new ExactSvmScheme(getSolanaAgentSigner(payer.walletAddress), { rpcUrl: rail.rpcUrl })
  );
}

// EIP-712 domain of each EVM rail's USDC — required in `extra` so the
// signed EIP-3009 authorization verifies against the token contract.
const USDC_EIP712: Record<string, { name: string; version: string }> = {
  "eip155:8453": { name: "USD Coin", version: "2" },
  "eip155:84532": { name: "USDC", version: "2" },
};

const feePayerCache = new Map<string, string>();

/**
 * Solana x402 payments are co-signed by the facilitator, which pays the SOL
 * network fee. Its fee-payer address comes from the facilitator itself.
 */
async function getSvmFeePayer(caip2: string): Promise<string> {
  const cached = feePayerCache.get(caip2);
  if (cached) return cached;
  const supported = await createQerinCdpFacilitatorClient().getSupported();
  const kind = supported.kinds.find((k) => k.scheme === "exact" && k.network === caip2);
  const feePayer = kind?.extra?.feePayer;
  if (typeof feePayer !== "string") throw new Error(`The facilitator does not support Solana payments on ${caip2}`);
  feePayerCache.set(caip2, feePayer);
  return feePayer;
}

export async function buildTransferRequirements(rail: PaymentRail, payTo: string, amountUsd: number): Promise<PaymentRequirements> {
  const extra: Record<string, unknown> = rail.family === "evm"
    ? { ...(USDC_EIP712[rail.caip2] ?? { name: "USD Coin", version: "2" }) }
    : { feePayer: await getSvmFeePayer(rail.caip2) };
  return {
    scheme: "exact",
    network: rail.caip2 as PaymentRequirements["network"],
    asset: rail.usdc,
    amount: usdToAtomic(amountUsd).toString(),
    payTo,
    maxTimeoutSeconds: 300,
    extra,
  };
}

export interface TransferResult {
  txHash: string;
  network: string;
}

/**
 * Moves USDC out of a user's Qerin wallet without that wallet ever holding
 * gas: the wallet signs a transfer authorization (EIP-3009 on EVM, a
 * partially-signed SPL transfer on Solana) and the x402 facilitator submits
 * it, paying the network fee itself. Used for Qerin's per-query service fee
 * and for owner withdrawals.
 */
export async function transferFromAgentWallet(
  payer: Extract<AgentPayer, { kind: "agent" }>,
  payTo: string,
  amountUsd: number,
  description: string
): Promise<TransferResult> {
  if (!(amountUsd > 0)) throw new Error("Transfer amount must be positive");
  const requirements = await buildTransferRequirements(payer.rail, payTo, amountUsd);

  const client = new x402Client();
  // The default client cap ($1/payment) exists to stop runaway source
  // charges. Owner-signed withdrawals may legitimately exceed it, so the cap
  // is set to exactly this transfer and nothing more.
  client.setSpendControls({ maxAmountPerPayment: `$${amountUsd.toFixed(6)}` });
  registerPayerScheme(client, payer);

  const payload = await client.createPaymentPayload({
    x402Version: 2,
    resource: { url: "https://qerin.vercel.app/agent/transfer", description, mimeType: "application/json" },
    accepts: [requirements],
  });

  const facilitator = createQerinCdpFacilitatorClient();
  const verified = await facilitator.verify(payload, requirements);
  if (!verified.isValid) {
    throw new Error(`Transfer was rejected: ${verified.invalidMessage ?? verified.invalidReason ?? "invalid payment"}`);
  }
  const settled = await facilitator.settle(payload, requirements);
  if (!settled.success || !settled.transaction) {
    throw new Error(`Transfer did not settle: ${settled.errorMessage ?? settled.errorReason ?? "unknown error"}`);
  }
  return { txHash: settled.transaction, network: settled.network };
}
