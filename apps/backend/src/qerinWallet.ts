import { isAddress } from "viem";
import { address as solanaAddress, isAddress as isSolanaAddress } from "@solana/kit";
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { agentWalletsEnabled, findAgentWallet, getBaseUsdcBalance, getOrCreateAgentWallet } from "./agentWallet.js";
import { findSolanaAgentWallet, getOrCreateSolanaAgentWallet, getSolanaUsdcBalance } from "./solana/agentWallet.js";
import { getRails, type PaymentRail } from "./rails.js";
import { transferFromAgentWallet, type AgentPayer, type TransferResult } from "./agentPayer.js";
import { recordAgentSpend } from "./agentPolicy.js";

// One Qerin account = one wallet per rail, all owned by the same connected
// EVM wallet. This module is the single place that knows how to find,
// provision, and read balances for each rail's wallet, so the routes and the
// agent never branch on chain family themselves.

export interface RailWalletView {
  rail: PaymentRail["id"];
  name: string;
  family: PaymentRail["family"];
  testnet: boolean;
  address: string | null;
  usdc: number | null;
  explorerUrl: string | null;
  /** Whether the agent can run research from this rail right now. */
  researchReady: boolean;
}

/**
 * Where Qerin's service fee is paid to on each rail. A treasury only ever
 * receives — it never needs funding. Without one configured, the rail can
 * still be funded and withdrawn from, but the agent won't run research on it
 * (it would have no way to charge for the answer).
 */
export function getTreasuryAddress(rail: PaymentRail): string | null {
  if (rail.family === "evm") {
    const explicit = process.env.QERIN_TREASURY_ADDRESS;
    if (explicit && isAddress(explicit)) return explicit;
    return null;
  }
  const solana = process.env.QERIN_SOLANA_TREASURY_ADDRESS;
  return solana && isSolanaAddress(solana) ? solana : null;
}

async function findWallet(rail: PaymentRail, owner: string): Promise<string | null> {
  return rail.family === "evm" ? findAgentWallet(owner) : findSolanaAgentWallet(owner);
}

async function provisionWallet(rail: PaymentRail, owner: string): Promise<string> {
  return rail.family === "evm" ? getOrCreateAgentWallet(owner) : getOrCreateSolanaAgentWallet(owner);
}

// Balances are public on-chain reads; a short cache keeps a burst of page
// loads from hammering the free public RPCs.
const balanceCache = new Map<string, { until: number; usdc: number | null }>();
const BALANCE_TTL_MS = 4_000;

export async function readRailBalance(rail: PaymentRail, walletAddress: string, fresh = false): Promise<number | null> {
  const key = `${rail.caip2}:${walletAddress}`;
  const cached = balanceCache.get(key);
  if (!fresh && cached && cached.until > Date.now()) return cached.usdc;
  const usdc = rail.family === "evm" ? await getBaseUsdcBalance(walletAddress) : await getSolanaUsdcBalance(walletAddress);
  balanceCache.set(key, { until: Date.now() + BALANCE_TTL_MS, usdc });
  return usdc;
}

export function invalidateBalance(rail: PaymentRail, walletAddress: string): void {
  balanceCache.delete(`${rail.caip2}:${walletAddress}`);
}

/**
 * Every rail's wallet for `owner`. With `provision`, wallets that don't exist
 * yet are created — only call that after the owner has proven control of
 * the account, since each creation is a CDP operation. `fresh` skips the
 * balance cache (used right after the user says they've sent funds).
 */
export async function listQerinWallets(owner: string, provision = false, fresh = false): Promise<RailWalletView[]> {
  if (!agentWalletsEnabled() || !isAddress(owner)) return [];
  return Promise.all(getRails().map(async (rail): Promise<RailWalletView> => {
    let address: string | null = null;
    try {
      address = provision ? await provisionWallet(rail, owner) : await findWallet(rail, owner);
    } catch (err) {
      console.error(`Could not ${provision ? "provision" : "find"} ${rail.name} wallet:`, err);
    }
    const usdc = address ? await readRailBalance(rail, address, fresh) : null;
    return {
      rail: rail.id,
      name: rail.name,
      family: rail.family,
      testnet: rail.testnet,
      address,
      usdc,
      explorerUrl: address ? rail.explorerAddressUrl(address) : null,
      researchReady: Boolean(address && getTreasuryAddress(rail)),
    };
  }));
}

/**
 * Picks the first rail (in rails.ts preference order) whose wallet can cover
 * `requiredUsd` and that has a treasury to pay Qerin's fee into.
 */
export async function chooseAgentPayer(
  owner: string,
  requiredUsd: number
): Promise<{ payer: Extract<AgentPayer, { kind: "agent" }>; balanceUsd: number } | null> {
  if (!agentWalletsEnabled() || !isAddress(owner)) return null;
  for (const rail of getRails()) {
    if (!getTreasuryAddress(rail)) continue;
    const walletAddress = await findWallet(rail, owner).catch(() => null);
    if (!walletAddress) continue;
    const balance = await readRailBalance(rail, walletAddress, true);
    if (balance !== null && balance + 1e-9 >= requiredUsd) {
      return { payer: { kind: "agent", owner, rail, walletAddress }, balanceUsd: balance };
    }
  }
  return null;
}

/** Charges Qerin's service fee (plus any fee owed) from the payer's wallet. */
export async function collectServiceFee(
  payer: Extract<AgentPayer, { kind: "agent" }>,
  amountUsd: number
): Promise<TransferResult> {
  const treasury = getTreasuryAddress(payer.rail);
  if (!treasury) throw new Error(`No Qerin treasury is configured for ${payer.rail.name}`);
  const result = await transferFromAgentWallet(payer, treasury, amountUsd, "Qerin research service fee");
  invalidateBalance(payer.rail, payer.walletAddress);
  return result;
}

/** A Solana destination must already hold a USDC account to receive USDC. */
async function solanaDestinationReady(rail: PaymentRail, destination: string): Promise<boolean> {
  const [ata] = await findAssociatedTokenPda({
    owner: solanaAddress(destination),
    mint: solanaAddress(rail.usdc),
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });
  try {
    const res = await fetch(rail.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getAccountInfo", params: [ata, { encoding: "base64" }] }),
      signal: AbortSignal.timeout(5_000),
    });
    const data = (await res.json()) as { result?: { value: unknown } };
    return Boolean(data.result?.value);
  } catch {
    return false;
  }
}

export function validateWithdrawDestination(rail: PaymentRail, owner: string, destination: unknown): string | null {
  if (typeof destination !== "string" || destination.trim() === "") return "A destination address is required";
  if (rail.family === "evm") {
    // EVM withdrawals only ever return funds to the wallet that owns the account.
    if (!isAddress(destination) || destination.toLowerCase() !== owner.toLowerCase()) {
      return "Base withdrawals go back to the wallet that owns this Qerin account";
    }
    return null;
  }
  return isSolanaAddress(destination) ? null : "Enter a valid Solana address";
}

export async function executeWithdrawal(
  owner: string,
  rail: PaymentRail,
  destination: string,
  amountUsd: number
): Promise<{ ok: true; result: TransferResult; explorerUrl: string } | { ok: false; error: string }> {
  const walletAddress = await findWallet(rail, owner);
  if (!walletAddress) return { ok: false, error: `You don't have a ${rail.name} Qerin wallet yet` };
  const balance = await readRailBalance(rail, walletAddress, true);
  if (balance === null) return { ok: false, error: `Couldn't read your ${rail.name} balance. Try again shortly.` };
  if (amountUsd > balance + 1e-9) return { ok: false, error: `Your ${rail.name} Qerin wallet holds $${balance.toFixed(2)} USDC` };
  if (rail.family === "svm" && !(await solanaDestinationReady(rail, destination))) {
    return { ok: false, error: "That Solana address has no USDC account yet. Receive any USDC there first, then withdraw." };
  }

  const payer = { kind: "agent" as const, owner, rail, walletAddress };
  const result = await transferFromAgentWallet(payer, destination, amountUsd, "Qerin wallet withdrawal");
  invalidateBalance(rail, walletAddress);
  const explorerUrl = rail.explorerTxUrl(result.txHash);
  await recordAgentSpend(owner, [{
    kind: "withdrawal",
    label: `Withdrawal to ${destination.slice(0, 6)}…${destination.slice(-4)}`,
    amountUsd,
    rail: rail.id,
    txHash: result.txHash,
    explorerUrl,
    at: new Date().toISOString(),
  }]).catch((err) => console.error("Could not record withdrawal activity:", err));
  return { ok: true, result, explorerUrl };
}
