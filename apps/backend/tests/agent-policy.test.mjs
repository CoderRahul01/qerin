import test from "node:test";
import assert from "node:assert/strict";
import { privateKeyToAccount } from "viem/accounts";
import { checkPolicy, DEFAULT_POLICY, parsePolicy, validatePolicyInput, QERIN_SERVICE_FEE_USD } from "../dist/agentPolicy.js";
import { buildIntentMessage, isSignedByOwner } from "../dist/ownerIntents.js";
import { getRail, getRails, getRailByCaip2, usdToAtomic, atomicToUsd } from "../dist/rails.js";
import { validateWithdrawDestination } from "../dist/qerinWallet.js";

const state = (policy, spentTodayUsd = 0) => ({ policy: { ...DEFAULT_POLICY, ...policy }, spentTodayUsd, feeOwedUsd: 0, activity: [] });

test("agent refuses to spend while paused", () => {
  const decision = checkPolicy(state({ paused: true }), 0.09);
  assert.equal(decision.ok, false);
  assert.equal(decision.code, "agent_paused");
});

test("agent refuses a question above the per-question limit", () => {
  const decision = checkPolicy(state({ perQueryUsd: 0.1 }), 0.081 + 0.03);
  assert.equal(decision.code, "per_query_limit");
  assert.match(decision.message, /\$0\.10 per-question limit/);
});

test("agent refuses once the daily limit would be crossed, and allows exactly up to it", () => {
  assert.equal(checkPolicy(state({ dailyUsd: 1 }, 0.95), 0.09).code, "daily_limit");
  assert.equal(checkPolicy(state({ dailyUsd: 1 }, 0.91), 0.09).ok, true);
});

test("a typical question passes the default policy", () => {
  assert.equal(checkPolicy(state({}), 0.011 + QERIN_SERVICE_FEE_USD).ok, true);
});

test("policy input is validated against bounds and rounded to cents", () => {
  assert.deepEqual(validatePolicyInput({ perQueryUsd: "0.3", dailyUsd: 5, paused: false }), { perQueryUsd: 0.3, dailyUsd: 5, paused: false });
  assert.match(validatePolicyInput({ perQueryUsd: 0.05, dailyUsd: 5, paused: false }), /Per-question limit/);
  assert.match(validatePolicyInput({ perQueryUsd: 6, dailyUsd: 50, paused: false }), /Per-question limit/);
  assert.match(validatePolicyInput({ perQueryUsd: 0.5, dailyUsd: 101, paused: false }), /Daily limit/);
  assert.match(validatePolicyInput({ perQueryUsd: 1, dailyUsd: 0.5, paused: false }), /can't be lower/);
  assert.match(validatePolicyInput({ perQueryUsd: 0.2, dailyUsd: 1, paused: "no" }), /paused/);
  assert.match(validatePolicyInput({ perQueryUsd: "abc", dailyUsd: 1, paused: false }), /Per-question limit/);
});

test("stored policies fall back to safe defaults and are clamped", () => {
  assert.deepEqual(parsePolicy(undefined), DEFAULT_POLICY);
  assert.deepEqual(parsePolicy({ perQueryUsd: 999, dailyUsd: -1, paused: "yes" }), { perQueryUsd: 5, dailyUsd: 0.09, paused: false });
});

test("owner intent messages are explicit and only the owner's signature redeems them", async () => {
  const owner = privateKeyToAccount(`0x${"33".repeat(32)}`);
  const other = privateKeyToAccount(`0x${"44".repeat(32)}`);
  const message = buildIntentMessage(owner.address, "withdraw", [["Chain", "Base"], ["Amount (USDC)", "1.5"], ["To", owner.address]], "n-1", "2030-01-01T00:00:00.000Z");
  assert.equal(message, [
    "Qerin wallet withdrawal",
    "Domain:qerin.vercel.app",
    `Account:${owner.address.toLowerCase()}`,
    "Chain:Base",
    "Amount (USDC):1.5",
    `To:${owner.address}`,
    "Nonce:n-1",
    "Expires:2030-01-01T00:00:00.000Z",
  ].join("\n"));

  const good = await owner.signMessage({ message });
  assert.equal(await isSignedByOwner(owner.address, message, good), true);
  assert.equal(await isSignedByOwner(owner.address, message, await other.signMessage({ message })), false);
  assert.equal(await isSignedByOwner(owner.address, message.replace("1.5", "150"), good), false);
  assert.equal(await isSignedByOwner(owner.address, message, "not-a-signature"), false);
});

test("rails switch between mainnet and testnet together, never mixed", () => {
  process.env.QERIN_WALLET_ENV = "mainnet";
  assert.deepEqual(getRails().map((r) => [r.id, r.caip2, r.testnet]), [
    ["base", "eip155:8453", false],
    ["solana", "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", false],
  ]);
  process.env.QERIN_WALLET_ENV = "testnet";
  assert.deepEqual(getRails().map((r) => [r.id, r.caip2, r.testnet]), [
    ["base", "eip155:84532", true],
    ["solana", "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1", true],
  ]);
  assert.equal(getRailByCaip2("eip155:84532")?.name, "Base Sepolia");
  process.env.QERIN_SOLANA_WALLETS = "off";
  assert.deepEqual(getRails().map((r) => r.id), ["base"]);
  delete process.env.QERIN_SOLANA_WALLETS;
  process.env.QERIN_WALLET_ENV = "mainnet";
  assert.equal(getRail("bitcoin"), null);
});

test("USDC amounts convert exactly at 6 decimals", () => {
  assert.equal(usdToAtomic(0.08), 80000n);
  assert.equal(usdToAtomic(1.234567), 1234567n);
  assert.equal(atomicToUsd("1500000"), 1.5);
});

test("Base withdrawals only go back to the owner; Solana needs a valid address", () => {
  const owner = "0xAbCdEf0123456789aBcDeF0123456789abCDef01";
  const base = getRail("base");
  const solana = getRail("solana");
  assert.equal(validateWithdrawDestination(base, owner, owner.toLowerCase()), null);
  assert.match(validateWithdrawDestination(base, owner, "0x1111111111111111111111111111111111111111"), /back to the wallet/);
  assert.equal(validateWithdrawDestination(solana, owner, "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"), null);
  assert.match(validateWithdrawDestination(solana, owner, "0xnot-solana"), /valid Solana address/);
  assert.match(validateWithdrawDestination(solana, owner, ""), /destination/);
});
