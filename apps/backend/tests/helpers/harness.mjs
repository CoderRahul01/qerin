// Offline test harness for the Qerin wallet + agent stack.
//
// Nothing here is a hand-written stand-in for Qerin's own logic. It replaces
// only the outside world, and does so faithfully enough that the real x402
// libraries run end to end:
//   - Firestore        → in-memory store with the same surface as db.ts
//   - CDP wallet API   → holds REAL secp256k1 / ed25519 keys and really signs
//   - x402 facilitator → verifies real EIP-3009 signatures / Solana tx sigs
//   - x402 source      → a real 402 → PAYMENT-SIGNATURE → PAYMENT-RESPONSE seller
//   - Base / Solana RPC → balances the test controls
import { createHash, generateKeyPairSync } from "node:crypto";
import { privateKeyToAccount } from "viem/accounts";
import { verifyTypedData } from "viem";
import {
  getBase58Decoder,
  getBase64Decoder,
  getBase64Encoder,
  getTransactionDecoder,
  getTransactionEncoder,
} from "@solana/kit";
import {
  decodePaymentSignatureHeader,
  encodePaymentRequiredHeader,
  encodePaymentResponseHeader,
} from "@x402/core/http";

export const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const SOLANA_USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export { SOLANA_MAINNET_CAIP2 as SOLANA_CAIP2 } from "@x402/svm";
import { SOLANA_MAINNET_CAIP2 as SOLANA_CAIP2 } from "@x402/svm";
export const SOLANA_FEE_PAYER = "CKPKJWNdJEqa81x7CkZ14BVPiY6y16Sxs7owznqtWYp5";
export const TREASURY = "0x000000000000000000000000000000000000dEaD";
export const SOLANA_TREASURY = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";

// ── In-memory Firestore ──────────────────────────────────────────────────────

export class FakeDb {
  constructor() {
    this.store = new Map();
  }
  collection(name) {
    return makeCollection(this, name);
  }
  read(path) {
    return this.store.get(path);
  }
  async runTransaction(fn) {
    const writes = [];
    const tx = {
      get: async (ref) => ref.get(),
      set: (ref, data, options) => writes.push(() => ref.set(data, options)),
      update: (ref, data) => writes.push(() => ref.update(data)),
      delete: (ref) => writes.push(() => ref.delete()),
    };
    const result = await fn(tx);
    for (const write of writes) await write();
    return result;
  }
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function makeDoc(db, path) {
  const id = path.split("/").pop();
  return {
    id,
    path,
    async get() {
      const data = db.store.get(path);
      return { id, exists: data !== undefined, data: () => clone(data) };
    },
    async set(data, options) {
      const current = options?.merge ? db.store.get(path) ?? {} : {};
      db.store.set(path, { ...current, ...clone(data) });
    },
    async update(data) {
      if (!db.store.has(path)) throw new Error(`No document to update: ${path}`);
      db.store.set(path, { ...db.store.get(path), ...clone(data) });
    },
    async delete() {
      db.store.delete(path);
    },
    collection(sub) {
      return makeCollection(db, `${path}/${sub}`);
    },
  };
}

function makeCollection(db, path) {
  const docsIn = () => [...db.store.keys()].filter((k) => k.startsWith(`${path}/`) && !k.slice(path.length + 1).includes("/"));
  const query = (filters) => ({
    where: (field, op, value) => query([...filters, [field, op, value]]),
    async get() {
      const docs = docsIn()
        .map((k) => ({ id: k.split("/").pop(), exists: true, data: () => clone(db.store.get(k)) }))
        .filter((d) => filters.every(([f, , v]) => d.data()[f] === v));
      return { docs, empty: docs.length === 0, size: docs.length };
    },
  });
  return {
    id: path.split("/").pop(),
    path,
    doc: (id) => makeDoc(db, `${path}/${id}`),
    async add(data) {
      const ref = makeDoc(db, `${path}/${crypto.randomUUID()}`);
      await ref.set(data);
      return ref;
    },
    ...query([]),
  };
}

// ── Environment ──────────────────────────────────────────────────────────────

export function setTestEnv(overrides = {}) {
  const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  Object.assign(process.env, {
    CDP_API_KEY_ID: "test-key-id",
    CDP_API_KEY_SECRET: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    CDP_WALLET_SECRET: privateKey.export({ type: "pkcs8", format: "der" }).toString("base64"),
    QERIN_INTERNAL_SECRET: "test-internal-secret",
    QERIN_TREASURY_ADDRESS: TREASURY,
    QERIN_SOLANA_TREASURY_ADDRESS: SOLANA_TREASURY,
    QERIN_WALLET_ENV: "mainnet",
    ...overrides,
  });
  delete process.env.QERIN_WALLET_PRIVATE_KEY;
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.NVIDIA_API_KEY;
  delete process.env.QERIN_REGISTRY_ADDRESS;
  delete process.env.QERIN_REGISTRY_ADDRESS_BOTCHAIN;
  delete process.env.QERIN_SOLANA_WALLETS;
}

// ── The outside world ───────────────────────────────────────────────────────

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });
}

function uintFields(types, primaryType) {
  return new Set((types[primaryType] ?? []).filter((f) => /^uint|^int/.test(f.type)).map((f) => f.name));
}

const TRANSFER_WITH_AUTHORIZATION = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
};

export class World {
  constructor() {
    this.evmAccounts = new Map(); // name -> viem account
    this.solAccounts = new Map(); // name -> { address, keyPair }
    this.baseBalances = new Map(); // lowercased address -> atomic bigint
    this.solBalances = new Map(); // address -> atomic bigint
    this.settlements = []; // facilitator settles
    this.sourcePayments = []; // payments the x402 source accepted
    this.calls = [];
    this.tamperSolanaSigning = false;
    this.failSettle = false;
    this.sourceAcceptsSolana = true;
    this.sourceAcceptsBase = true;
    this.sourcePriceAtomic = "1000"; // $0.001
    this.txCounter = 0;
  }

  install() {
    this.originalFetch = globalThis.fetch;
    globalThis.fetch = (input, init) => this.handle(input, init);
  }

  uninstall() {
    globalThis.fetch = this.originalFetch;
  }

  fundBase(address, usd) {
    this.baseBalances.set(address.toLowerCase(), BigInt(Math.round(usd * 1e6)));
  }

  fundSolana(address, usd) {
    this.solBalances.set(address, BigInt(Math.round(usd * 1e6)));
  }

  baseBalance(address) {
    return Number(this.baseBalances.get(address.toLowerCase()) ?? 0n) / 1e6;
  }

  solBalance(address) {
    return Number(this.solBalances.get(address) ?? 0n) / 1e6;
  }

  nextTx(family) {
    this.txCounter += 1;
    if (family === "evm") return `0x${this.txCounter.toString(16).padStart(64, "0")}`;
    return getBase58Decoder().decode(createHash("sha512").update(`tx${this.txCounter}`).digest());
  }

  async handle(input, init = {}) {
    const url = new URL(typeof input === "string" ? input : input.url);
    const method = (init.method ?? (typeof input === "string" ? "GET" : input.method) ?? "GET").toUpperCase();
    const headers = new Headers(init.headers ?? (typeof input === "string" ? undefined : input.headers));
    const bodyText = init.body ? String(init.body) : typeof input !== "string" && input.body ? await input.text() : "";
    const body = bodyText ? JSON.parse(bodyText) : undefined;
    this.calls.push({ url: url.href, method });

    if (url.host === "api.cdp.coinbase.com") return this.cdp(url.pathname, method, body, headers);
    if (url.host === "mainnet.base.org") return this.baseRpc(body);
    if (url.host === "api.mainnet-beta.solana.com") return this.solanaRpc(body);
    if (url.host === "superhighway.walls.sh") return this.x402Source(url, headers);
    return new Response("not found", { status: 404 });
  }

  // CDP Server Wallet + x402 facilitator
  async cdp(path, method, body, headers) {
    if (!headers.get("authorization")?.startsWith("Bearer ")) return json({ errorMessage: "unauthenticated" }, 401);
    if (method === "POST" && path.includes("/accounts") && !headers.get("x-wallet-auth")) {
      return json({ errorMessage: "missing wallet auth" }, 401);
    }

    let m;
    if (path === "/platform/v2/evm/accounts" && method === "POST") {
      if (this.evmAccounts.has(body.name)) return json({ errorType: "already_exists" }, 409);
      const key = `0x${createHash("sha256").update(`evm:${body.name}`).digest("hex")}`;
      const account = privateKeyToAccount(key);
      this.evmAccounts.set(body.name, account);
      return json({ address: account.address, name: body.name }, 201);
    }
    if ((m = path.match(/^\/platform\/v2\/evm\/accounts\/by-name\/(.+)$/))) {
      const account = this.evmAccounts.get(m[1]);
      return account ? json({ address: account.address, name: m[1] }) : json({ errorType: "not_found" }, 404);
    }
    if ((m = path.match(/^\/platform\/v2\/evm\/accounts\/(0x[0-9a-fA-F]{40})\/sign\/typed-data$/))) {
      const account = [...this.evmAccounts.values()].find((a) => a.address.toLowerCase() === m[1].toLowerCase());
      if (!account) return json({ errorType: "not_found" }, 404);
      const { EIP712Domain, ...types } = body.types;
      void EIP712Domain;
      const ints = uintFields(types, body.primaryType);
      const message = Object.fromEntries(Object.entries(body.message).map(([k, v]) => [k, ints.has(k) ? BigInt(v) : v]));
      const domain = { ...body.domain, ...(body.domain.chainId !== undefined ? { chainId: Number(body.domain.chainId) } : {}) };
      const signature = await account.signTypedData({ domain, types, primaryType: body.primaryType, message });
      return json({ signature });
    }
    if (path === "/platform/v2/solana/accounts" && method === "POST") {
      if (this.solAccounts.has(body.name)) return json({ errorType: "already_exists" }, 409);
      const keyPair = await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]);
      const raw = new Uint8Array(await crypto.subtle.exportKey("raw", keyPair.publicKey));
      const address = getBase58Decoder().decode(raw);
      this.solAccounts.set(body.name, { address, keyPair });
      return json({ address, name: body.name }, 201);
    }
    if ((m = path.match(/^\/platform\/v2\/solana\/accounts\/by-name\/(.+)$/))) {
      const account = this.solAccounts.get(m[1]);
      return account ? json({ address: account.address, name: m[1] }) : json({ errorType: "not_found" }, 404);
    }
    if ((m = path.match(/^\/platform\/v2\/solana\/accounts\/([1-9A-HJ-NP-Za-km-z]+)\/sign\/transaction$/))) {
      const account = [...this.solAccounts.values()].find((a) => a.address === m[1]);
      if (!account) return json({ errorType: "not_found" }, 404);
      const tx = getTransactionDecoder().decode(getBase64Encoder().encode(body.transaction));
      let signingKey = account.keyPair.privateKey;
      if (this.tamperSolanaSigning) {
        signingKey = (await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"])).privateKey;
      }
      const signature = new Uint8Array(await crypto.subtle.sign("Ed25519", signingKey, Uint8Array.from(tx.messageBytes)));
      const signed = { ...tx, signatures: { ...tx.signatures, [account.address]: signature } };
      return json({ signedTransaction: getBase64Decoder().decode(getTransactionEncoder().encode(signed)) });
    }

    if (path === "/platform/v2/x402/supported") {
      return json({
        kinds: [
          { x402Version: 2, scheme: "exact", network: "eip155:8453" },
          { x402Version: 2, scheme: "exact", network: SOLANA_CAIP2, extra: { feePayer: SOLANA_FEE_PAYER } },
        ],
        extensions: [],
        signers: {},
      });
    }
    if (path === "/platform/v2/x402/verify") {
      const check = await this.checkPayment(body.paymentPayload, body.paymentRequirements);
      return json(check.ok ? { isValid: true, payer: check.from } : { isValid: false, invalidReason: check.reason });
    }
    if (path === "/platform/v2/x402/settle") {
      const req = body.paymentRequirements;
      const check = await this.checkPayment(body.paymentPayload, req);
      if (!check.ok || this.failSettle) {
        return json({ success: false, errorReason: check.reason ?? "settle_failed", transaction: "", network: req.network });
      }
      const family = req.network.startsWith("eip155") ? "evm" : "svm";
      this.move(family, check.from, req.payTo, BigInt(req.amount));
      const transaction = this.nextTx(family);
      this.settlements.push({ network: req.network, from: check.from, to: req.payTo, amount: req.amount, transaction });
      return json({ success: true, transaction, network: req.network, payer: check.from });
    }
    return json({ errorType: "not_found", path }, 404);
  }

  move(family, from, to, amount) {
    const balances = family === "evm" ? this.baseBalances : this.solBalances;
    const key = (a) => (family === "evm" ? a.toLowerCase() : a);
    const have = balances.get(key(from)) ?? 0n;
    if (have < amount) throw new Error("insufficient funds in test world");
    balances.set(key(from), have - amount);
    balances.set(key(to), (balances.get(key(to)) ?? 0n) + amount);
  }

  /** Verifies a payment the way a real facilitator / seller would. */
  async checkPayment(paymentPayload, requirements) {
    if (requirements.network.startsWith("eip155")) {
      const { signature, authorization } = paymentPayload.payload;
      const valid = await verifyTypedData({
        address: authorization.from,
        domain: { name: requirements.extra.name, version: requirements.extra.version, chainId: 8453, verifyingContract: requirements.asset },
        types: TRANSFER_WITH_AUTHORIZATION,
        primaryType: "TransferWithAuthorization",
        message: { ...authorization, value: BigInt(authorization.value), validAfter: BigInt(authorization.validAfter), validBefore: BigInt(authorization.validBefore) },
        signature,
      });
      if (!valid) return { ok: false, reason: "invalid_signature" };
      if (authorization.to.toLowerCase() !== requirements.payTo.toLowerCase()) return { ok: false, reason: "wrong_recipient" };
      if (authorization.value !== requirements.amount) return { ok: false, reason: "wrong_amount" };
      if ((this.baseBalances.get(authorization.from.toLowerCase()) ?? 0n) < BigInt(authorization.value)) {
        return { ok: false, reason: "insufficient_funds" };
      }
      return { ok: true, from: authorization.from };
    }

    const tx = getTransactionDecoder().decode(getBase64Encoder().encode(paymentPayload.payload.transaction));
    const owner = [...this.solAccounts.values()].find((a) => tx.signatures[a.address]);
    if (!owner) return { ok: false, reason: "unknown_signer" };
    const ok = await crypto.subtle.verify("Ed25519", owner.keyPair.publicKey, Uint8Array.from(tx.signatures[owner.address]), Uint8Array.from(tx.messageBytes));
    if (!ok) return { ok: false, reason: "invalid_signature" };
    if (!(SOLANA_FEE_PAYER in tx.signatures)) return { ok: false, reason: "fee_payer_missing" };
    if ((this.solBalances.get(owner.address) ?? 0n) < BigInt(requirements.amount)) return { ok: false, reason: "insufficient_funds" };
    return { ok: true, from: owner.address };
  }

  baseRpc(body) {
    const one = (call) => {
      if (call.method === "eth_call" && call.params[0].data.startsWith("0x70a08231")) {
        const address = `0x${call.params[0].data.slice(-40)}`.toLowerCase();
        return { jsonrpc: "2.0", id: call.id, result: `0x${(this.baseBalances.get(address) ?? 0n).toString(16).padStart(64, "0")}` };
      }
      if (call.method === "eth_blockNumber") return { jsonrpc: "2.0", id: call.id, result: "0x10" };
      if (call.method === "eth_gasPrice") return { jsonrpc: "2.0", id: call.id, result: "0x3b9aca00" };
      return { jsonrpc: "2.0", id: call.id, error: { message: "unsupported" } };
    };
    return json(Array.isArray(body) ? body.map(one) : one(body));
  }

  solanaRpc(body) {
    const reply = (result) => json({ jsonrpc: "2.0", id: body.id, result });
    if (body.method === "getTokenAccountsByOwner") {
      const amount = this.solBalances.get(body.params[0]);
      if (amount === undefined) return reply({ context: { slot: 1 }, value: [] });
      return reply({ context: { slot: 1 }, value: [{ pubkey: "ata", account: { data: { parsed: { info: { tokenAmount: { amount: amount.toString() } } } } } }] });
    }
    if (body.method === "getAccountInfo") {
      if (body.params[0] === SOLANA_USDC) {
        // A real SPL mint layout: decimals (6) at byte 44, initialized at 45.
        const data = new Uint8Array(82);
        data[44] = 6;
        data[45] = 1;
        return reply({
          context: { slot: 1 },
          value: { data: [Buffer.from(data).toString("base64"), "base64"], executable: false, lamports: 1_000_000, owner: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", rentEpoch: 0, space: 82 },
        });
      }
      // Any other account (a destination's USDC account) exists.
      return reply({ context: { slot: 1 }, value: { data: ["", "base64"], executable: false, lamports: 2_039_280, owner: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", rentEpoch: 0, space: 165 } });
    }
    if (body.method === "getLatestBlockhash") {
      return reply({ context: { slot: 1 }, value: { blockhash: "4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uasJtWCJziofM", lastValidBlockHeight: 1000 } });
    }
    return json({ jsonrpc: "2.0", id: body.id, error: { message: `unsupported ${body.method}` } });
  }

  // A real x402 v2 seller: 402 first, then verify the payment signature,
  // settle it (moving test funds), and return PAYMENT-RESPONSE.
  async x402Source(url, headers) {
    const accepts = [];
    if (this.sourceAcceptsBase) {
      accepts.push({ scheme: "exact", network: "eip155:8453", asset: BASE_USDC, amount: this.sourcePriceAtomic, payTo: "0x1111111111111111111111111111111111111111", maxTimeoutSeconds: 60, extra: { name: "USD Coin", version: "2" } });
    }
    if (this.sourceAcceptsSolana) {
      accepts.push({ scheme: "exact", network: SOLANA_CAIP2, asset: SOLANA_USDC, amount: this.sourcePriceAtomic, payTo: SOLANA_TREASURY, maxTimeoutSeconds: 60, extra: { feePayer: SOLANA_FEE_PAYER } });
    }
    const paymentRequired = { x402Version: 2, resource: { url: url.href, description: "search", mimeType: "application/json" }, accepts };

    const signatureHeader = headers.get("payment-signature");
    if (!signatureHeader) {
      return json({}, 402, { "PAYMENT-REQUIRED": encodePaymentRequiredHeader(paymentRequired) });
    }
    const payload = decodePaymentSignatureHeader(signatureHeader);
    const requirements = accepts.find((a) => a.network === payload.accepted.network);
    const check = requirements ? await this.checkPayment(payload, requirements) : { ok: false };
    if (!check.ok) return json({ error: "payment invalid", reason: check.reason }, 402, { "PAYMENT-REQUIRED": encodePaymentRequiredHeader(paymentRequired) });

    const family = requirements.network.startsWith("eip155") ? "evm" : "svm";
    this.move(family, check.from, requirements.payTo, BigInt(requirements.amount));
    const transaction = this.nextTx(family);
    this.sourcePayments.push({ network: requirements.network, from: check.from, amount: requirements.amount, transaction });
    return json(
      { results: [{ title: "Verified research result", url: "https://example.org/report", snippet: "Paid content" }] },
      200,
      { "PAYMENT-RESPONSE": encodePaymentResponseHeader({ success: true, transaction, network: requirements.network, payer: check.from }) }
    );
  }
}

export const INTERNAL_HEADERS = { "X-Qerin-Internal-Secret": "test-internal-secret" };

export async function accessProof(account) {
  const { accountAccessMessage } = await import("../../dist/accountProof.js");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const signature = await account.signMessage({ message: accountAccessMessage(account.address, expiresAt) });
  return JSON.stringify({ expiresAt, signature });
}

export function rateLimitEnv() {
  return { RATE_LIMITER: { limit: async () => ({ success: true }) } };
}

export function executionCtx() {
  const tasks = [];
  return { tasks, waitUntil: (p) => tasks.push(p), passThroughOnException() {} };
}

export async function readSse(res) {
  const text = await res.text();
  return text.split("\n\n").filter(Boolean).map((frame) => {
    let event = "message";
    const data = [];
    for (const line of frame.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
    }
    return { event, data: data.length ? JSON.parse(data.join("\n")) : null };
  });
}
