// End-to-end: a user's own Qerin wallet funds their own Qerin agent.
// Runs the real Hono app, the real x402 client/signing code, and real
// signatures against the offline World in helpers/harness.mjs.
import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { privateKeyToAccount } from "viem/accounts";
import { SOLANA_TREASURY, TREASURY, FakeDb, World, INTERNAL_HEADERS, accessProof, executionCtx, rateLimitEnv, readSse, setTestEnv } from "./helpers/harness.mjs";

setTestEnv();
const { default: app } = await import("../dist/index.js");
const { __setDbForTests } = await import("../dist/db.js");

let world;
let db;
let keyCounter = 0x10;

before(() => {
  world = new World();
  world.install();
});
after(() => world.uninstall());
beforeEach(() => {
  setTestEnv();
  db = new FakeDb();
  __setDbForTests(db);
  world.failSettle = false;
  world.tamperSolanaSigning = false;
  world.sourceAcceptsBase = true;
  world.sourceAcceptsSolana = true;
});

// Each test gets a fresh owner so module-level wallet caches never leak.
function newOwner() {
  keyCounter += 1;
  return privateKeyToAccount(`0x${keyCounter.toString(16).padStart(64, "0")}`);
}

async function call(path, { owner, method = "GET", body, proof = true } = {}) {
  const headers = { ...INTERNAL_HEADERS, "Content-Type": "application/json" };
  if (owner) headers["X-Qerin-Account-Id"] = owner.address;
  if (owner && proof) headers["X-Qerin-Account-Proof"] = await accessProof(owner);
  const ctx = executionCtx();
  const res = await app.request(path, { method, headers, body: body ? JSON.stringify(body) : undefined }, rateLimitEnv(), ctx);
  await Promise.allSettled(ctx.tasks);
  return res;
}

async function provision(owner) {
  const res = await call("/v1/wallet/provision", { owner, method: "POST" });
  assert.equal(res.status, 200);
  const view = await res.json();
  return {
    view,
    base: view.wallets.find((w) => w.rail === "base").address,
    solana: view.wallets.find((w) => w.rail === "solana").address,
  };
}

async function askWithVault(owner, question) {
  const headers = {
    ...INTERNAL_HEADERS,
    "Content-Type": "application/json",
    "X-Qerin-Account-Id": owner.address,
    "X-Qerin-Account-Proof": await accessProof(owner),
    "X-Qerin-Chat-Vault-Id": crypto.randomUUID(),
  };
  const ctx = executionCtx();
  const res = await app.request("/v1/answer", { method: "POST", headers, body: JSON.stringify({ question: question ?? "What is the latest on Ethereum restaking?", network: "botchain" }) }, rateLimitEnv(), ctx);
  await Promise.allSettled(ctx.tasks);
  return res;
}

async function signIntent(owner, path, body) {
  const prep = await call(path.replace("confirm", "prepare"), { owner, method: "POST", body });
  const intent = await prep.json();
  assert.equal(prep.status, 200, JSON.stringify(intent));
  const signature = await owner.signMessage({ message: intent.message });
  return { intent, signature };
}

test("every user gets their own wallet on every rail, and only after proving ownership", async () => {
  const owner = newOwner();
  const denied = await call("/v1/wallet/provision", { owner, method: "POST", proof: false });
  assert.equal(denied.status, 401);

  const { view, base, solana } = await provision(owner);
  assert.match(base, /^0x[0-9a-fA-F]{40}$/);
  assert.match(solana, /^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
  assert.notEqual(base.toLowerCase(), owner.address.toLowerCase(), "the Qerin wallet is separate from MetaMask");
  assert.deepEqual(view.policy, { perQueryUsd: 0.25, dailyUsd: 2, paused: false });
  assert.equal(view.wallets.every((w) => w.researchReady), true);

  // Idempotent: provisioning again returns the same wallets.
  const again = await provision(owner);
  assert.equal(again.base, base);
  assert.equal(again.solana, solana);

  // Another user gets different wallets.
  const other = await provision(newOwner());
  assert.notEqual(other.base, base);
  assert.notEqual(other.solana, solana);
});

test("the agent pays sources AND Qerin's fee from the user's Base wallet; Qerin fronts nothing", async () => {
  const owner = newOwner();
  const { base } = await provision(owner);
  world.fundBase(base, 1);

  const res = await askWithVault(owner);
  assert.equal(res.headers.get("content-type")?.includes("text/event-stream"), true);
  const events = await readSse(res);
  const done = events.find((e) => e.event === "done");
  assert.ok(done, JSON.stringify(events));

  const answer = done.data;
  assert.equal(answer.paidFrom.address, base);
  assert.equal(answer.paidFrom.personal, true);
  assert.equal(answer.receipt[0].settlement, "x402");
  assert.match(answer.receipt[0].basescanUrl, /^https:\/\/basescan\.org\/tx\/0x/);
  assert.equal(answer.serviceFee.status, "settled");
  assert.equal(answer.serviceFee.amount, "0.080");
  assert.equal(answer.totalCharged, "0.081");

  // Money actually moved from the user's own wallet: $0.001 source + $0.08 fee.
  assert.equal(world.baseBalance(base), 1 - 0.081);
  assert.equal(world.baseBalance(TREASURY), 0.08);
  const sourcePayment = world.sourcePayments.at(-1);
  assert.equal(sourcePayment.from.toLowerCase(), base.toLowerCase());

  const wallet = await (await call("/v1/wallet", { owner })).json();
  assert.equal(wallet.spentTodayUsd, 0.081);
  assert.deepEqual(wallet.activity.map((a) => a.kind), ["fee", "source"]);
  assert.match(wallet.activity[0].explorerUrl, /basescan\.org\/tx\//);
});

test("with Base empty, the agent pays from the user's Solana wallet instead", async () => {
  const owner = newOwner();
  const { solana } = await provision(owner);
  world.fundSolana(solana, 0.5);

  const events = await readSse(await askWithVault(owner));
  const done = events.find((e) => e.event === "done");
  assert.ok(done, JSON.stringify(events));
  assert.equal(done.data.paidFrom.rail, "solana");
  assert.match(done.data.receipt[0].basescanUrl, /^https:\/\/explorer\.solana\.com\/tx\//);
  assert.equal(done.data.serviceFee.status, "settled");
  assert.equal(Math.round(world.solBalance(solana) * 1e6), Math.round((0.5 - 0.081) * 1e6));
  assert.equal(world.solBalance(SOLANA_TREASURY) >= 0.08, true);
});

test("an unfunded wallet gets a clear 402 and nothing moves", async () => {
  const owner = newOwner();
  await provision(owner);
  const before = world.settlements.length;
  const res = await askWithVault(owner);
  assert.equal(res.status, 402);
  const body = await res.json();
  assert.equal(body.error, "insufficient_balance");
  assert.match(body.message, /Add USDC to your Qerin wallet/);
  assert.equal(world.settlements.length, before);
});

test("a user without a Qerin wallet is told to open one (no shared Qerin wallet needed)", async () => {
  const res = await askWithVault(newOwner());
  assert.equal(res.status, 402);
  assert.match((await res.json()).message, /Open your Qerin wallet/);
});

test("the owner's spend policy binds the agent: pause, per-question, daily", async () => {
  const owner = newOwner();
  const { base } = await provision(owner);
  world.fundBase(base, 5);

  // Pause the agent with a signed policy change.
  let { intent, signature } = await signIntent(owner, "/v1/wallet/policy/confirm", { perQueryUsd: 0.25, dailyUsd: 2, paused: true });
  let res = await call("/v1/wallet/policy/confirm", { owner, method: "POST", body: { nonce: intent.nonce, signature } });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).policy.paused, true);

  res = await askWithVault(owner);
  assert.equal(res.status, 403);
  assert.equal((await res.json()).error, "agent_paused");

  // A per-question limit below the fee blocks every question.
  ({ intent, signature } = await signIntent(owner, "/v1/wallet/policy/confirm", { perQueryUsd: 0.09, dailyUsd: 0.09, paused: false }));
  await call("/v1/wallet/policy/confirm", { owner, method: "POST", body: { nonce: intent.nonce, signature } });
  res = await askWithVault(owner, "What happened in crypto news today?"); // cryptoslate + superhighway = $0.011 + fee
  assert.equal(res.status, 403);
  assert.equal((await res.json()).error, "per_query_limit");

  // Daily limit: one question fits, the second does not.
  ({ intent, signature } = await signIntent(owner, "/v1/wallet/policy/confirm", { perQueryUsd: 0.09, dailyUsd: 0.1, paused: false }));
  await call("/v1/wallet/policy/confirm", { owner, method: "POST", body: { nonce: intent.nonce, signature } });
  const first = await readSse(await askWithVault(owner));
  assert.ok(first.find((e) => e.event === "done"));
  res = await askWithVault(owner);
  assert.equal(res.status, 403);
  assert.equal((await res.json()).error, "daily_limit");
});

test("policy changes need a fresh owner signature and cannot be replayed or forged", async () => {
  const owner = newOwner();
  const attacker = newOwner();
  await provision(owner);

  const { intent } = await signIntent(owner, "/v1/wallet/policy/confirm", { perQueryUsd: 5, dailyUsd: 100, paused: false });
  const forged = await attacker.signMessage({ message: intent.message });
  let res = await call("/v1/wallet/policy/confirm", { owner, method: "POST", body: { nonce: intent.nonce, signature: forged } });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /doesn't match/);

  const signature = await owner.signMessage({ message: intent.message });
  res = await call("/v1/wallet/policy/confirm", { owner, method: "POST", body: { nonce: intent.nonce, signature } });
  assert.equal(res.status, 200);
  res = await call("/v1/wallet/policy/confirm", { owner, method: "POST", body: { nonce: intent.nonce, signature } });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /already used/);

  // Another account can't redeem the owner's intent even with the right signature.
  res = await call("/v1/wallet/policy/confirm", { owner: attacker, method: "POST", body: { nonce: intent.nonce, signature } });
  assert.equal(res.status, 400);

  // Out-of-bounds limits are rejected before anything is signed.
  res = await call("/v1/wallet/policy/prepare", { owner, method: "POST", body: { perQueryUsd: 50, dailyUsd: 100, paused: false } });
  assert.equal(res.status, 400);
});

test("owner withdraws Base USDC back to their own MetaMask, gaslessly", async () => {
  const owner = newOwner();
  const { base } = await provision(owner);
  world.fundBase(base, 3);

  // Base withdrawals can't be redirected to another address.
  const prepBad = await call("/v1/wallet/withdraw/prepare", { owner, method: "POST", body: { rail: "base", amountUsd: 1, destination: "0x1111111111111111111111111111111111111111" } });
  const badIntent = await prepBad.json();
  assert.ok(badIntent.message.includes(`To:${owner.address.toLowerCase()}`), "destination is forced to the owner");

  const { intent, signature } = await signIntent(owner, "/v1/wallet/withdraw/confirm", { rail: "base", amountUsd: 2.5 });
  assert.match(intent.message, /Amount \(USDC\):2\.5/);
  const res = await call("/v1/wallet/withdraw/confirm", { owner, method: "POST", body: { nonce: intent.nonce, signature } });
  const body = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));
  assert.match(body.explorerUrl, /basescan\.org\/tx\//);
  assert.equal(world.baseBalance(base), 0.5);
  assert.equal(world.baseBalance(owner.address), 2.5);
  assert.equal(body.wallet.activity[0].kind, "withdrawal");
  assert.equal(body.wallet.spentTodayUsd, 0, "withdrawals don't count against the agent's daily limit");
});

test("withdrawals above the balance are refused before anything is signed on-chain", async () => {
  const owner = newOwner();
  const { base } = await provision(owner);
  world.fundBase(base, 1);
  const before = world.settlements.length;
  const { intent, signature } = await signIntent(owner, "/v1/wallet/withdraw/confirm", { rail: "base", amountUsd: 4 });
  const res = await call("/v1/wallet/withdraw/confirm", { owner, method: "POST", body: { nonce: intent.nonce, signature } });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /holds \$1\.00/);
  assert.equal(world.settlements.length, before);
});

test("owner withdraws Solana USDC to a Solana address they choose", async () => {
  const owner = newOwner();
  const { solana } = await provision(owner);
  world.fundSolana(solana, 2);
  const destination = "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV";
  const { intent, signature } = await signIntent(owner, "/v1/wallet/withdraw/confirm", { rail: "solana", amountUsd: 1.25, destination });
  assert.ok(intent.message.includes(`To:${destination}`));
  const res = await call("/v1/wallet/withdraw/confirm", { owner, method: "POST", body: { nonce: intent.nonce, signature } });
  const body = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));
  assert.match(body.explorerUrl, /explorer\.solana\.com\/tx\//);
  assert.equal(world.solBalance(solana), 0.75);
  assert.equal(world.solBalance(destination), 1.25);
});

test("a Solana signature that doesn't come from the user's wallet is never used", async () => {
  const owner = newOwner();
  const { solana } = await provision(owner);
  world.fundSolana(solana, 2);
  world.tamperSolanaSigning = true;
  const { intent, signature } = await signIntent(owner, "/v1/wallet/withdraw/confirm", { rail: "solana", amountUsd: 1, destination: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV" });
  const res = await call("/v1/wallet/withdraw/confirm", { owner, method: "POST", body: { nonce: intent.nonce, signature } });
  assert.equal(res.status, 502);
  assert.equal(world.solBalance(solana), 2, "no funds moved");
});

test("if the fee can't settle, the answer still ships and the fee is carried, then collected next time", async () => {
  const owner = newOwner();
  const { base } = await provision(owner);
  world.fundBase(base, 1);

  world.failSettle = true;
  const first = (await readSse(await askWithVault(owner))).find((e) => e.event === "done");
  assert.equal(first.data.serviceFee.status, "owed");
  let wallet = await (await call("/v1/wallet", { owner })).json();
  assert.equal(wallet.feeOwedUsd, 0.08);

  world.failSettle = false;
  const second = (await readSse(await askWithVault(owner))).find((e) => e.event === "done");
  assert.equal(second.data.serviceFee.status, "settled");
  assert.equal(second.data.serviceFee.amount, "0.160");
  wallet = await (await call("/v1/wallet", { owner })).json();
  assert.equal(wallet.feeOwedUsd, 0);
  assert.equal(Math.round(world.baseBalance(TREASURY) * 1e6) >= 160000, true);
});

test("a source that settles nowhere means no fee and no charge", async () => {
  const owner = newOwner();
  const { base } = await provision(owner);
  world.fundBase(base, 1);
  world.sourceAcceptsBase = false;
  world.sourceAcceptsSolana = false;
  const events = await readSse(await askWithVault(owner));
  const error = events.find((e) => e.event === "error");
  assert.ok(error);
  assert.match(error.data.message, /not charged/);
  assert.equal(world.baseBalance(base), 1);
});

test("balance endpoint reports the user's own wallets, never a shared one", async () => {
  const owner = newOwner();
  const { base, solana } = await provision(owner);
  world.fundBase(base, 1.5);
  world.fundSolana(solana, 0.5);
  // The wallet screen's refresh reads chain directly, past the short cache.
  const fresh = await (await call("/v1/wallet?fresh=1", { owner })).json();
  assert.equal(fresh.totalUsdc, 2);
  const res = await call("/v1/account/balance", { owner });
  const body = await res.json();
  assert.equal(body.walletUsdc, 2);
  assert.equal(body.balance, 2);
  assert.deepEqual(body.wallets.map((w) => w.rail), ["base", "solana"]);
});

