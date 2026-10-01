import {
  getBase58Encoder,
  getBase64Encoder,
  getBase64EncodedWireTransaction,
  getTransactionDecoder,
  isAddress as isSolanaAddress,
  type Address,
  type SignatureBytes,
  type SignatureDictionary,
  type TransactionPartialSigner,
} from "@solana/kit";
import { isAddress } from "viem";
import { agentWalletName, cdpRequest } from "../agentWallet.js";
import { normalizeAccountId } from "../accounts.js";
import { getDb } from "../db.js";
import { getRail } from "../rails.js";

// Personal Solana agent wallets: the SVM twin of agentWallet.ts. Every
// connected user gets one CDP-held Solana account, named after the EVM wallet
// they signed in with, so a Qerin account is one identity with one wallet per
// chain. The user funds it with USDC from Phantom, MetaMask (Solana), or any
// Solana wallet, and the Qerin agent signs that user's Solana payments with
// it — Qerin never holds or fronts Solana funds for anyone.
//
// The private key never leaves CDP's enclave; every signature it returns is
// verified locally against the wallet's public key before it is used.

const CDP_SOLANA_PATH = "/platform/v2/solana/accounts";

const walletCache = new Map<string, string>();

function asSolanaAddress(value: unknown): string | null {
  return typeof value === "string" && isSolanaAddress(value) ? value : null;
}

/** Looks up an already-provisioned Solana agent wallet without creating one. */
export async function findSolanaAgentWallet(ownerAddress: string): Promise<string | null> {
  if (!isAddress(ownerAddress)) return null;
  const owner = normalizeAccountId(ownerAddress);
  const cached = walletCache.get(owner);
  if (cached) return cached;

  const doc = await getDb().collection("accounts").doc(owner).get();
  const stored = doc.exists ? asSolanaAddress(doc.data()?.agentSolanaWallet) : null;
  if (stored) walletCache.set(owner, stored);
  return stored;
}

export async function getOrCreateSolanaAgentWallet(ownerAddress: string): Promise<string> {
  if (!isAddress(ownerAddress)) throw new Error("A Solana agent wallet requires a connected wallet address");
  const existing = await findSolanaAgentWallet(ownerAddress);
  if (existing) return existing;

  const owner = normalizeAccountId(ownerAddress);
  // Solana account names are unique per CDP project, independent of EVM
  // names, so the same deterministic name is safe to reuse here.
  const name = agentWalletName(owner);

  let address: string | null = null;
  const lookup = await cdpRequest("GET", `${CDP_SOLANA_PATH}/by-name/${name}`);
  if (lookup.status === 200) address = asSolanaAddress(lookup.json.address);

  if (!address) {
    const created = await cdpRequest("POST", CDP_SOLANA_PATH, { name });
    address = asSolanaAddress(created.json.address);
    if (!address && created.status === 409) {
      const retry = await cdpRequest("GET", `${CDP_SOLANA_PATH}/by-name/${name}`);
      address = asSolanaAddress(retry.json.address);
    }
    if (!address) {
      throw new Error(`CDP could not provision a Solana agent wallet (HTTP ${created.status}: ${String(created.json.errorMessage ?? created.json.errorType ?? "unknown error")})`);
    }
  }

  await getDb().collection("accounts").doc(owner).set({ agentSolanaWallet: address }, { merge: true });
  walletCache.set(owner, address);
  return address;
}

interface TokenAccountsResponse {
  result?: { value?: Array<{ account?: { data?: { parsed?: { info?: { tokenAmount?: { amount?: string } } } } } }> };
  error?: { message?: string };
}

/** USDC held by a Solana address on the active Solana rail, or null when the RPC can't say. */
export async function getSolanaUsdcBalance(owner: string): Promise<number | null> {
  const rail = getRail("solana");
  if (!rail) return null;
  try {
    const res = await fetch(rail.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "getTokenAccountsByOwner",
        params: [owner, { mint: rail.usdc }, { encoding: "jsonParsed", commitment: "confirmed" }],
      }),
      signal: AbortSignal.timeout(5_000),
    });
    const data = (await res.json()) as TokenAccountsResponse;
    if (!res.ok || data.error || !Array.isArray(data.result?.value)) return null;
    let atomic = 0n;
    for (const entry of data.result.value) {
      const amount = entry.account?.data?.parsed?.info?.tokenAmount?.amount;
      if (amount && /^\d+$/.test(amount)) atomic += BigInt(amount);
    }
    return Number(atomic) / 1_000_000;
  } catch (error) {
    console.error("Could not read Solana agent wallet USDC balance:", error);
    return null;
  }
}

async function verifyEd25519(publicKey: Uint8Array, signature: Uint8Array, message: Uint8Array): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey("raw", publicKey.slice().buffer, "Ed25519", false, ["verify"]);
    return await crypto.subtle.verify("Ed25519", key, signature.slice().buffer, message.slice().buffer);
  } catch {
    return false;
  }
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((byte, i) => byte === b[i]);
}

/**
 * x402 SVM signer backed by a user's Solana agent wallet. CDP signs the whole
 * wire transaction; only this wallet's signature is taken back out of it, and
 * only after checking that CDP signed exactly the message it was given.
 */
export function getSolanaAgentSigner(walletAddress: string): TransactionPartialSigner {
  const address = walletAddress as Address;
  const rail = getRail("solana");
  const publicKey = getBase58Encoder().encode(walletAddress) as Uint8Array;

  return {
    address,
    async signTransactions(transactions) {
      const results: SignatureDictionary[] = [];
      for (const transaction of transactions) {
        const res = await cdpRequest("POST", `${CDP_SOLANA_PATH}/${walletAddress}/sign/transaction`, {
          transaction: getBase64EncodedWireTransaction(transaction),
          ...(rail ? { network: rail.cdpNetwork } : {}),
        });
        const signed = res.json.signedTransaction;
        if (res.status !== 200 || typeof signed !== "string") {
          throw new Error(`Solana agent wallet could not sign the payment (HTTP ${res.status})`);
        }

        const decoded = getTransactionDecoder().decode(getBase64Encoder().encode(signed));
        const message = Uint8Array.from(transaction.messageBytes);
        if (!sameBytes(Uint8Array.from(decoded.messageBytes), message)) {
          throw new Error("Solana agent wallet signed a different transaction than requested");
        }
        const signature = decoded.signatures[address];
        if (!signature || !(await verifyEd25519(publicKey, Uint8Array.from(signature), message))) {
          throw new Error("Solana agent wallet signature did not match the wallet address");
        }
        results.push(Object.freeze({ [address]: signature as SignatureBytes }) as SignatureDictionary);
      }
      return results;
    },
  };
}
