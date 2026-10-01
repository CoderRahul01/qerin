// GET /v1/admin/wallet-config: an operator check that reports whether each
// Qerin wallet value is set and usable, and never the values themselves.
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { SOLANA_TREASURY, TREASURY, INTERNAL_HEADERS, executionCtx, rateLimitEnv, setTestEnv } from "./helpers/harness.mjs";

const FIREBASE = JSON.stringify({ project_id: "qerin-test", client_email: "svc@qerin-test.iam", private_key: "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n" });

setTestEnv({ FIREBASE_SERVICE_ACCOUNT: FIREBASE });
const { default: app } = await import("../dist/index.js");

const NAMES = [
  "CDP_API_KEY_ID",
  "CDP_API_KEY_SECRET",
  "CDP_WALLET_SECRET",
  "QERIN_TREASURY_ADDRESS",
  "QERIN_SOLANA_TREASURY_ADDRESS",
  "QERIN_INTERNAL_SECRET",
  "FIREBASE_SERVICE_ACCOUNT",
];

beforeEach(() => setTestEnv({ FIREBASE_SERVICE_ACCOUNT: FIREBASE }));

async function getConfig(headers = INTERNAL_HEADERS) {
  const res = await app.request("/v1/admin/wallet-config", { headers }, rateLimitEnv(), executionCtx());
  return { status: res.status, text: await res.text() };
}

test("wallet-config needs the internal secret", async () => {
  assert.equal((await getConfig({})).status, 403);
  assert.equal((await getConfig({ "X-Qerin-Internal-Secret": "wrong" })).status, 403);
});

test("a fully configured Worker reports every value valid, every rail with a treasury, and leaks no value", async () => {
  const { status, text } = await getConfig();
  assert.equal(status, 200);
  const report = JSON.parse(text);

  assert.equal(report.walletEnv, "mainnet");
  assert.deepEqual(Object.keys(report.values).sort(), [...NAMES].sort());
  for (const name of NAMES) assert.deepEqual(report.values[name], { set: true, valid: true }, name);
  assert.deepEqual(
    report.rails.map((r) => [r.id, r.caip2, r.testnet, r.hasTreasury]),
    [
      ["base", "eip155:8453", false, true],
      ["solana", "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", false, true],
    ],
  );
  assert.equal(report.ready, true);

  // Nothing secret, and not even the public treasury addresses, is echoed back.
  for (const name of NAMES) {
    const value = process.env[name];
    assert.ok(!text.includes(value), `${name} leaked`);
  }
  for (const addr of [TREASURY, SOLANA_TREASURY]) assert.ok(!text.toLowerCase().includes(addr.toLowerCase()));
});

test("missing and malformed values are reported as false, and the Worker is not ready", async () => {
  setTestEnv({
    FIREBASE_SERVICE_ACCOUNT: "{not json",
    CDP_WALLET_SECRET: "not-a-key",
    QERIN_TREASURY_ADDRESS: "0x1234",
    QERIN_SOLANA_TREASURY_ADDRESS: "",
  });
  const report = JSON.parse((await getConfig()).text);

  assert.deepEqual(report.values.FIREBASE_SERVICE_ACCOUNT, { set: true, valid: false });
  assert.deepEqual(report.values.CDP_WALLET_SECRET, { set: true, valid: false });
  assert.deepEqual(report.values.QERIN_TREASURY_ADDRESS, { set: true, valid: false });
  assert.deepEqual(report.values.QERIN_SOLANA_TREASURY_ADDRESS, { set: false, valid: false });
  assert.deepEqual(report.values.CDP_API_KEY_SECRET, { set: true, valid: true });
  assert.deepEqual(report.rails.map((r) => r.hasTreasury), [false, false]);
  assert.equal(report.ready, false);
});

test("testnet switches every reported rail together", async () => {
  setTestEnv({ FIREBASE_SERVICE_ACCOUNT: FIREBASE, QERIN_WALLET_ENV: "testnet" });
  const report = JSON.parse((await getConfig()).text);
  assert.equal(report.walletEnv, "testnet");
  assert.ok(report.rails.every((r) => r.testnet));
});
