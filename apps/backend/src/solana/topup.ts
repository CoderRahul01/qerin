import { findAssociatedTokenPda } from "@solana-program/token";
import { address, getBase58Encoder, type Address } from "@solana/kit";
import { getQerinSolanaSigner } from "./wallet.js";
import { getSolanaNetwork } from "./network.js";
import { buildTopupSignMessage } from "../cryptoTopup.js";
import { recordDeposit } from "../accounts.js";

// Solana equivalent of cryptoTopup.ts's verifyAndCreditCryptoDeposit: the
// depositor sends USDC to Qerin's Solana deposit address with any wallet,
// then proves they control the sending address by signing the same
// `accountId + txSignature` message cryptographically bound in the EVM flow
// — here via ed25519 instead of ECDSA, since that's what Solana wallets sign
// with. Without this, anyone could spot a public transfer to Qerin's
// well-known deposit address on an explorer and claim its value for a
// different account.

const TOKEN_PROGRAM_ADDRESS = address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const USDC_DECIMALS = 6;

export interface SolanaDepositResult {
  verified: boolean;
  balance: number;
  reason?: string;
}

interface RpcTokenBalance {
  accountIndex: number;
  mint: string;
  owner?: string;
  uiTokenAmount: { amount: string; decimals: number };
}

interface RpcParsedTransaction {
  transaction: { message: { accountKeys: Array<{ pubkey: string; signer?: boolean }> } };
  meta: {
    err: unknown;
    preTokenBalances?: RpcTokenBalance[];
    postTokenBalances?: RpcTokenBalance[];
  } | null;
}

async function getParsedTransaction(rpcUrl: string, signature: string): Promise<RpcParsedTransaction | null> {
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTransaction",
        params: [signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }],
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await res.json()) as { result: RpcParsedTransaction | null; error?: { message: string } };
    if (body.error) throw new Error(body.error.message);
    return body.result;
  } catch {
    return null;
  }
}

/**
 * Verifies an ed25519 signature over `message` was produced by the holder of
 * `publicKeyBase58`. Uses WebCrypto directly (available on Workers, Node 22+,
 * and browsers) rather than a Solana-specific helper, since none of
 * @solana/kit's exports take a base58 address straight to a verifiable key.
 */
async function verifyEd25519(publicKeyBase58: string, signatureBase58: string, message: string): Promise<boolean> {
  try {
    const publicKeyBytes = getBase58Encoder().encode(publicKeyBase58) as Uint8Array;
    const signatureBytes = getBase58Encoder().encode(signatureBase58) as Uint8Array;
    if (publicKeyBytes.length !== 32 || signatureBytes.length !== 64) return false;
    const key = await crypto.subtle.importKey("raw", publicKeyBytes.slice().buffer, "Ed25519", false, ["verify"]);
    const data = new TextEncoder().encode(message);
    return await crypto.subtle.verify("Ed25519", key, signatureBytes.slice().buffer, data);
  } catch {
    return false;
  }
}

export async function verifyAndCreditSolanaDeposit(
  accountId: string,
  txSignature: string,
  walletPublicKeyBase58: string,
  messageSignatureBase58: string,
  networkName?: string
): Promise<SolanaDepositResult> {
  const network = getSolanaNetwork(networkName);
  const signer = await getQerinSolanaSigner();

  const message = buildTopupSignMessage(accountId, txSignature);
  const signatureValid = await verifyEd25519(walletPublicKeyBase58, messageSignatureBase58, message);
  if (!signatureValid) {
    return { verified: false, balance: 0, reason: "Could not verify wallet signature" };
  }

  const tx = await getParsedTransaction(network.rpcUrl, txSignature);
  if (!tx) {
    return { verified: false, balance: 0, reason: "Transaction not found on-chain yet — try again shortly" };
  }
  if (tx.meta?.err) {
    return { verified: false, balance: 0, reason: "Transaction did not succeed" };
  }

  const feePayer = tx.transaction.message.accountKeys[0]?.pubkey;
  if (feePayer !== walletPublicKeyBase58) {
    return { verified: false, balance: 0, reason: "Signature does not match the transaction's fee payer" };
  }

  const [qerinAta] = await findAssociatedTokenPda({
    owner: signer.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
    mint: address(network.usdc as Address),
  });

  const pre = tx.meta?.preTokenBalances ?? [];
  const post = tx.meta?.postTokenBalances ?? [];
  const preByIndex = new Map(pre.map((b) => [b.accountIndex, b]));

  let transferredAtomic = 0n;
  for (const balance of post) {
    if (balance.mint !== network.usdc) continue;
    const accountKey = tx.transaction.message.accountKeys[balance.accountIndex]?.pubkey;
    if (accountKey !== qerinAta) continue;
    const before = BigInt(preByIndex.get(balance.accountIndex)?.uiTokenAmount.amount ?? "0");
    const after = BigInt(balance.uiTokenAmount.amount);
    if (after > before) transferredAtomic += after - before;
  }

  if (transferredAtomic === 0n) {
    return { verified: false, balance: 0, reason: "No USDC transfer to Qerin's Solana deposit address found in this transaction" };
  }

  const transferredUsd = Number(transferredAtomic) / 10 ** USDC_DECIMALS;
  const { balance, accountFound, reason } = await recordDeposit(
    accountId,
    txSignature,
    transferredUsd,
    network.cluster
  );
  if (reason) return { verified: false, balance: 0, reason };
  if (!accountFound) return { verified: false, balance: 0, reason: "Unknown account" };
  return { verified: true, balance };
}
