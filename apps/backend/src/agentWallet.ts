import { SignJWT, importPKCS8, type JWTPayload } from "jose";
import { getTypesForEIP712Domain, isAddress, recoverTypedDataAddress, type TypedDataDomain } from "viem";
import type { ClientEvmSigner } from "@x402/evm";
import { getCdpAuthHeaders, getCdpCredentials } from "./cdpAuth.js";
import { normalizeAccountId } from "./accounts.js";
import { getDb } from "./db.js";
import { getNetwork } from "./networks.js";

// Personal agent wallets: every connected user gets their own CDP-held EVM
// account on Base, named after the wallet address they signed in with. The
// user funds it with USDC, and x402 source payments for their questions are
// signed by that account — never by Qerin's shared QERIN_WALLET_PRIVATE_KEY —
// so each payment's on-chain payer is attributable to exactly one user.
//
// Talks to the CDP REST API directly instead of through @coinbase/cdp-sdk for
// the reason documented in cdpAuth.ts (the SDK's nonce generation breaks under
// Wrangler's bundler). The wallet-auth JWT below is ported from the SDK's
// generateWalletJwt.

const CDP_HOST = "api.cdp.coinbase.com";
const CDP_BASE_PATH = "/platform/v2/evm/accounts";
const CDP_TIMEOUT_MS = 10_000;
const USDC_DECIMALS = 1_000_000;

export function agentWalletsEnabled(): boolean {
  return Boolean(process.env.CDP_API_KEY_ID && process.env.CDP_API_KEY_SECRET && process.env.CDP_WALLET_SECRET);
}

/**
 * CDP account names allow 2-36 alphanumeric/hyphen characters, so the full
 * 40-hex-character owner address doesn't fit — 30 hex characters (120 bits)
 * keeps the name deterministic per owner with no realistic collision.
 */
export function agentWalletName(ownerAddress: string): string {
  return `qerin-${ownerAddress.toLowerCase().replace(/^0x/, "").slice(0, 30)}`;
}

function sortKeys(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortKeys);
  return Object.keys(value as Record<string, unknown>)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = sortKeys((value as Record<string, unknown>)[key]);
      return acc;
    }, {});
}

/** JSON has no bigint — EIP-712 uint256 values travel as decimal strings. */
export function toJsonSafe(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(toJsonSafe);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, toJsonSafe(v)]));
  }
  return value;
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * X-Wallet-Auth token CDP requires on every state-changing wallet call. Bound
 * to the exact method + path and, via reqHash, to the exact request body.
 */
export async function generateWalletAuthJwt(
  walletSecret: string,
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claims: JWTPayload = { uris: [`${method} ${CDP_HOST}${path}`] };
  if (body && Object.keys(body).length > 0) {
    claims.reqHash = await sha256Hex(JSON.stringify(sortKeys(body)));
  }

  // The wallet secret is a base64 DER PKCS#8 EC key; jose wants PEM.
  const der = walletSecret.replace(/\s+/g, "");
  const pem = `-----BEGIN PRIVATE KEY-----\n${der.match(/.{1,64}/g)?.join("\n")}\n-----END PRIVATE KEY-----`;
  const key = await importPKCS8(pem, "ES256");
  const jti = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");

  return new SignJWT(claims)
    .setProtectedHeader({ alg: "ES256", typ: "JWT" })
    .setIssuedAt(now)
    .setNotBefore(now)
    .setJti(jti)
    .sign(key);
}

async function cdpRequest(
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>
): Promise<{ status: number; json: Record<string, unknown> }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(await getCdpAuthHeaders(getCdpCredentials(), CDP_HOST, path, method)),
  };
  if (method === "POST") {
    const walletSecret = process.env.CDP_WALLET_SECRET;
    if (!walletSecret) throw new Error("CDP_WALLET_SECRET is not set");
    headers["X-Wallet-Auth"] = await generateWalletAuthJwt(walletSecret, method, path, body);
  }

  const res = await fetch(`https://${CDP_HOST}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(CDP_TIMEOUT_MS),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, json };
}

const walletCache = new Map<string, `0x${string}`>();

function asAddress(value: unknown): `0x${string}` | null {
  return typeof value === "string" && isAddress(value) ? (value as `0x${string}`) : null;
}

/** Looks up an already-provisioned agent wallet without ever creating one. */
export async function findAgentWallet(ownerAddress: string): Promise<`0x${string}` | null> {
  if (!isAddress(ownerAddress)) return null;
  const owner = normalizeAccountId(ownerAddress);
  const cached = walletCache.get(owner);
  if (cached) return cached;

  const doc = await getDb().collection("accounts").doc(owner).get();
  const stored = doc.exists ? asAddress(doc.data()?.agentWallet) : null;
  if (stored) walletCache.set(owner, stored);
  return stored;
}

export async function getOrCreateAgentWallet(ownerAddress: string): Promise<`0x${string}`> {
  if (!isAddress(ownerAddress)) throw new Error("An agent wallet requires a connected wallet address");
  const existing = await findAgentWallet(ownerAddress);
  if (existing) return existing;

  const owner = normalizeAccountId(ownerAddress);
  const name = agentWalletName(owner);

  let address: `0x${string}` | null = null;
  const lookup = await cdpRequest("GET", `${CDP_BASE_PATH}/by-name/${name}`);
  if (lookup.status === 200) address = asAddress(lookup.json.address);

  if (!address) {
    const created = await cdpRequest("POST", CDP_BASE_PATH, { name });
    address = asAddress(created.json.address);
    if (!address && created.status === 409) {
      // Two requests raced to create the same named account — the name is
      // unique in CDP, so the loser just reads what the winner created.
      const retry = await cdpRequest("GET", `${CDP_BASE_PATH}/by-name/${name}`);
      address = asAddress(retry.json.address);
    }
    if (!address) {
      throw new Error(`CDP could not provision an agent wallet (HTTP ${created.status}: ${String(created.json.errorMessage ?? created.json.errorType ?? "unknown error")})`);
    }
  }

  await getDb().collection("accounts").doc(owner).set({ agentWallet: address }, { merge: true });
  walletCache.set(owner, address);
  return address;
}

/** USDC held by an address on Base mainnet, or null when the RPC can't say. */
export async function getBaseUsdcBalance(address: string): Promise<number | null> {
  const base = getNetwork("mainnet");
  try {
    const res = await fetch(base.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "eth_call",
        params: [{ to: base.usdc, data: `0x70a08231${address.slice(2).toLowerCase().padStart(64, "0")}` }, "latest"],
      }),
      signal: AbortSignal.timeout(5_000),
    });
    const data = (await res.json()) as { result?: string };
    if (!res.ok || typeof data.result !== "string" || data.result === "0x") return null;
    return Number(BigInt(data.result)) / USDC_DECIMALS;
  } catch (error) {
    console.error("Could not read agent wallet USDC balance:", error);
    return null;
  }
}

/**
 * x402 signer backed by a user's agent wallet. CDP returns only a signature,
 * so it is recovered locally and rejected unless it really came from that
 * wallet — a mis-signed payment must fail here, before it reaches a source.
 */
export function getAgentWalletSigner(address: `0x${string}`): ClientEvmSigner {
  return {
    address,
    async signTypedData({ domain, types, primaryType, message }) {
      const body = toJsonSafe({
        domain,
        types: { EIP712Domain: getTypesForEIP712Domain({ domain: domain as TypedDataDomain }), ...types },
        primaryType,
        message,
      }) as Record<string, unknown>;

      const res = await cdpRequest("POST", `${CDP_BASE_PATH}/${address}/sign/typed-data`, body);
      const signature = res.json.signature;
      if (res.status !== 200 || typeof signature !== "string") {
        throw new Error(`Agent wallet could not sign the payment (HTTP ${res.status})`);
      }

      const recovered = await recoverTypedDataAddress({
        domain: domain as TypedDataDomain,
        types: types as Record<string, { name: string; type: string }[]>,
        primaryType,
        message,
        signature: signature as `0x${string}`,
      });
      if (recovered.toLowerCase() !== address.toLowerCase()) {
        throw new Error("Agent wallet signature did not match the wallet address");
      }
      return signature as `0x${string}`;
    },
  };
}
