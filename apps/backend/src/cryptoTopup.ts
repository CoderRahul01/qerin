import { recoverMessageAddress } from "viem";
import { getQerinAccount } from "./wallet.js";
import { getActiveNetwork, getNetwork } from "./networks.js";
import { recordDeposit } from "./accounts.js";

// Direct on-chain USDC top-up — added after both Coinbase Onramp and
// Razorpay rejected Qerin as a "wallet top-up / crypto platform" merchant.
// The consumer sends USDC straight to Qerin's own Base wallet (the same
// wallet paidFetch.ts already pays sources from) with their own wallet;
// this backend only verifies the transfer actually happened on-chain and
// credits the balance. No fiat PSP, no merchant-category risk.
//
// Verification talks to Base's public RPC directly via plain JSON-RPC
// (fetch) rather than viem's createPublicClient — the backend's other viem
// usages (wallet.ts, recordReceipt.ts) only need account/wallet-client
// features, but @x402/evm vendors its own viem copy whose chain types
// collide with the top-level one specifically on PublicClient's broader
// action surface (e.g. getBlock). A raw JSON-RPC call sidesteps that
// entirely and needs nothing from viem/chains.

const USDC_DECIMALS = 1_000_000; // USDC has 6 decimals on Base.
const TRANSFER_TOPIC0 = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

const RPC_URLS: Record<"mainnet" | "testnet", string> = {
  mainnet: "https://mainnet.base.org",
  testnet: "https://sepolia.base.org",
};

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

async function getTransactionReceipt(txHash: string): Promise<RpcReceipt | null> {
  const rpcUrl = RPC_URLS[getActiveNetwork()];
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getTransactionReceipt",
      params: [txHash],
    }),
  });
  const body = (await res.json()) as { result: RpcReceipt | null; error?: { message: string } };
  if (body.error) throw new Error(body.error.message);
  return body.result;
}

/**
 * Message the frontend has the depositor's wallet sign after sending the
 * on-chain transfer. Binding accountId + txHash into the signed message
 * (rather than trusting the txHash alone) is what stops someone from
 * spotting an unrelated USDC transfer to Qerin's public wallet on Basescan
 * and claiming its value for their own account — recoverMessageAddress
 * below only succeeds if the signer controls the private key that actually
 * sent that specific transaction.
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
  signature: `0x${string}`
): Promise<CryptoDepositResult> {
  const network = getNetwork();
  const qerinAddress = getQerinAccount().address.toLowerCase();

  const message = buildTopupSignMessage(accountId, txHash);
  let signerAddress: string;
  try {
    signerAddress = await recoverMessageAddress({ message, signature });
  } catch {
    return { verified: false, balance: 0, reason: "Could not verify wallet signature" };
  }

  let receipt: RpcReceipt | null;
  try {
    receipt = await getTransactionReceipt(txHash);
  } catch {
    return { verified: false, balance: 0, reason: "Could not reach Base RPC — try again shortly" };
  }
  if (!receipt) {
    return { verified: false, balance: 0, reason: "Transaction not found on-chain yet — try again shortly" };
  }
  if (receipt.status !== "0x1") {
    return { verified: false, balance: 0, reason: "Transaction did not succeed" };
  }

  // The signer must be the account that actually sent the transaction —
  // otherwise anyone could sign the message for a transfer they didn't send.
  if (receipt.from.toLowerCase() !== signerAddress.toLowerCase()) {
    return { verified: false, balance: 0, reason: "Signature does not match the transaction sender" };
  }

  let transferredAtomic = 0n;
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== network.usdc.toLowerCase()) continue;
    if (log.topics[0]?.toLowerCase() !== TRANSFER_TOPIC0) continue;
    // Transfer(address indexed from, address indexed to, uint256 value):
    // topics[1] = from, topics[2] = to (each a 32-byte-padded address),
    // data = value (uint256, not indexed).
    const to = `0x${log.topics[2]?.slice(-40)}`;
    if (to.toLowerCase() !== qerinAddress) continue;
    transferredAtomic += BigInt(log.data);
  }

  if (transferredAtomic === 0n) {
    return { verified: false, balance: 0, reason: "No USDC transfer to Qerin's wallet found in this transaction" };
  }

  // Credit exactly what was actually sent on-chain — never trust a
  // claimed amount from the client, only what the receipt itself shows.
  const transferredUsd = Number(transferredAtomic) / USDC_DECIMALS;
  const { balance } = await recordDeposit(accountId, txHash, transferredUsd);
  return { verified: true, balance };
}
