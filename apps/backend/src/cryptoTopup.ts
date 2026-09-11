import { recoverMessageAddress } from "viem";
import { getQerinAccount } from "./wallet.js";
import { getNetwork } from "./networks.js";
import { recordDeposit } from "./accounts.js";

// Direct on-chain top-up — verifies any of:
//   1. ERC-20 token (USDC on Base, USDT on BOT Chain) transfer to Qerin's wallet
//   2. Native coin (ETH on Base, BOT on BOT Chain) transfer to Qerin's wallet
// No fiat PSP, no merchant-category risk.
//
// Verification talks directly to each chain's public RPC via plain JSON-RPC
// (fetch) rather than viem's createPublicClient — sidesteps @x402/evm viem
// type collisions (see original comment).

const ERC20_DECIMALS = 1_000_000; // 6 decimals for USDC / USDT
const NATIVE_DECIMALS = 1e18;     // 18 decimals for ETH / BOT
const TRANSFER_TOPIC0 = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

// BOT price cache: fetched from BDEX price API, refreshed every 5 minutes.
let _botPriceCache: { price: number; ts: number } | null = null;
const BOT_PRICE_TTL_MS = 5 * 60 * 1000;
const BOT_PRICE_FALLBACK = 12.20;
const WBOT_ADDRESS = "0xD5452816194a3784dBa983426cCe7c122F4abd30";

export async function fetchLiveBotPrice(): Promise<number> {
  const now = Date.now();
  if (_botPriceCache && now - _botPriceCache.ts < BOT_PRICE_TTL_MS) {
    return _botPriceCache.price;
  }
  try {
    const res = await fetch(
      `https://dex-wallet.botchain.ai/api/graph/price?token=${WBOT_ADDRESS}`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { success: boolean; data?: { price?: string } };
    const priceStr = body?.data?.price;
    const price = priceStr ? parseFloat(priceStr) : 0;
    if (price > 0) {
      _botPriceCache = { price, ts: now };
      return price;
    }
  } catch {
    // fall through to fallback
  }
  return BOT_PRICE_FALLBACK;
}

// ETH price cache: same pattern as BOT — live via Coinbase's public spot
// price endpoint (no API key required), refreshed every 5 minutes.
let _ethPriceCache: { price: number; ts: number } | null = null;
const ETH_PRICE_FALLBACK = 2500;

export async function fetchLiveEthPrice(): Promise<number> {
  const now = Date.now();
  if (_ethPriceCache && now - _ethPriceCache.ts < BOT_PRICE_TTL_MS) {
    return _ethPriceCache.price;
  }
  try {
    const res = await fetch("https://api.coinbase.com/v2/prices/ETH-USD/spot", {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { data?: { amount?: string } };
    const price = body?.data?.amount ? parseFloat(body.data.amount) : 0;
    if (price > 0) {
      _ethPriceCache = { price, ts: now };
      return price;
    }
  } catch {
    // fall through to fallback
  }
  return ETH_PRICE_FALLBACK;
}

interface RpcLog {
  address: string;
  topics: string[];
  data: string;
}

interface RpcReceipt {
  status: string;
  from: string;
  logs: RpcLog[];
}

interface RpcTransaction {
  from: string;
  to: string | null;
  value: string; // hex
}

async function rpcCall<T>(rpcUrl: string, method: string, params: unknown[]): Promise<T | null> {
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await res.json()) as { result: T | null; error?: { message: string } };
    if (body.error) throw new Error(body.error.message);
    return body.result;
  } catch {
    return null;
  }
}

async function getTransactionReceipt(rpcUrl: string, txHash: string): Promise<RpcReceipt | null> {
  return rpcCall<RpcReceipt>(rpcUrl, "eth_getTransactionReceipt", [txHash]);
}

async function getTransaction(rpcUrl: string, txHash: string): Promise<RpcTransaction | null> {
  return rpcCall<RpcTransaction>(rpcUrl, "eth_getTransactionByHash", [txHash]);
}

/**
 * Message the frontend has the depositor's wallet sign after sending the
 * on-chain transfer. Binding accountId + txHash into the signed message
 * (rather than trusting the txHash alone) is what stops someone from
 * spotting an unrelated transfer to Qerin's public wallet on chain and
 * claiming its value for their own account.
 */
export function buildTopupSignMessage(accountId: string, txHash: string): string {
  return `Qerin top-up confirmation\naccount:${accountId}\ntx:${txHash}`;
}

export interface CryptoDepositResult {
  verified: boolean;
  balance: number;
  reason?: string;
}

export async function verifyAndCreditCryptoDeposit(
  accountId: string,
  txHash: `0x${string}`,
  signature: `0x${string}`,
  networkName?: string
): Promise<CryptoDepositResult> {
  const network = getNetwork(networkName);
  const qerinAddress = getQerinAccount().address.toLowerCase();
  const isBotChain = network.chainId === 677;

  const message = buildTopupSignMessage(accountId, txHash);
  let signerAddress: string;
  try {
    signerAddress = await recoverMessageAddress({ message, signature });
  } catch {
    return { verified: false, balance: 0, reason: "Could not verify wallet signature" };
  }

  // Fetch both receipt (for token events + status) and tx (for native value)
  const [receipt, tx] = await Promise.all([
    getTransactionReceipt(network.rpcUrl, txHash),
    getTransaction(network.rpcUrl, txHash),
  ]);

  if (!receipt || !tx) {
    return {
      verified: false,
      balance: 0,
      reason: "Transaction not found on-chain yet — try again shortly",
    };
  }
  if (receipt.status !== "0x1") {
    return { verified: false, balance: 0, reason: "Transaction did not succeed" };
  }

  // Signer must be the transaction sender
  if (receipt.from.toLowerCase() !== signerAddress.toLowerCase()) {
    return {
      verified: false,
      balance: 0,
      reason: "Signature does not match the transaction sender",
    };
  }

  let transferredUsd = 0;

  // ── 1. Check native coin transfer (BOT or ETH) ──────────────────────────
  const txTo = tx.to?.toLowerCase() ?? "";
  const nativeValue = BigInt(tx.value || "0x0");
  if (txTo === qerinAddress && nativeValue > 0n) {
    const nativeAmount = Number(nativeValue) / NATIVE_DECIMALS;
    if (isBotChain) {
      const botPrice = await fetchLiveBotPrice();
      transferredUsd = nativeAmount * botPrice;
    } else {
      const ethPrice = await fetchLiveEthPrice();
      transferredUsd = nativeAmount * ethPrice;
    }
  }

  // ── 2. Check ERC-20 token transfer (USDC / USDT) ────────────────────────
  if (transferredUsd === 0) {
    const tokenAddress = (network.usdc ?? network.usdt ?? "").toLowerCase();
    let transferredAtomic = 0n;
    for (const log of receipt.logs) {
      if (!tokenAddress || log.address.toLowerCase() !== tokenAddress) continue;
      if (log.topics[0]?.toLowerCase() !== TRANSFER_TOPIC0) continue;
      const to = `0x${log.topics[2]?.slice(-40)}`;
      if (to.toLowerCase() !== qerinAddress) continue;
      transferredAtomic += BigInt(log.data);
    }
    if (transferredAtomic > 0n) {
      transferredUsd = Number(transferredAtomic) / ERC20_DECIMALS;
    }
  }

  if (transferredUsd === 0) {
    return {
      verified: false,
      balance: 0,
      reason: isBotChain
        ? "No BOT or USDT transfer to Qerin's wallet found in this transaction"
        : "No USDC transfer to Qerin's wallet found in this transaction",
    };
  }

  // Credit exactly what was actually sent on-chain — never trust the client's claimed amount.
  const { balance, accountFound, credited, reason } = await recordDeposit(
    accountId,
    txHash,
    transferredUsd,
    network.chainId.toString()
  );
  if (reason) {
    return { verified: false, balance: 0, reason };
  }
  if (!accountFound) {
    return { verified: false, balance: 0, reason: "Unknown account" };
  }
  // credited=false with no reason means this exact account already claimed
  // this exact tx before (idempotent retry) — treat as a successful confirm.
  void credited;
  return { verified: true, balance };
}
