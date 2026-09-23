import test from "node:test";
import assert from "node:assert/strict";
import { privateKeyToAccount } from "viem/accounts";
import { accountAccessMessage, verifyAccountProof } from "../dist/accountProof.js";
import { selectSources } from "../dist/selectSources.js";

test("only the wallet owner can authorize spending its Qerin balance", async () => {
  const owner = privateKeyToAccount(`0x${"11".repeat(32)}`);
  const other = privateKeyToAccount(`0x${"22".repeat(32)}`);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const signature = await owner.signMessage({ message: accountAccessMessage(owner.address, expiresAt) });
  const proof = JSON.stringify({ expiresAt, signature });
  assert.equal(await verifyAccountProof(owner.address, proof), true);
  assert.equal(await verifyAccountProof(other.address, proof), false);
  assert.equal(await verifyAccountProof(owner.address, JSON.stringify({ expiresAt: new Date(Date.now() - 1_000).toISOString(), signature })), false);
  assert.equal(await verifyAccountProof(owner.address, JSON.stringify({ expiresAt: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(), signature })), false);
});

test("source plan stays relevant and capped at two paid routes", () => {
  assert.deepEqual(selectSources("What was the history of wars in the middle east?"), ["superhighway"]);
  assert.deepEqual(selectSources("What is Bitcoin's market cap?"), ["superhighway"]);
  assert.deepEqual(selectSources("What is Bitcoin DEX liquidity?"), ["coingecko", "superhighway"]);
  assert.deepEqual(selectSources("What happened in crypto news today?"), ["cryptoslate", "superhighway"]);
  assert.ok(selectSources("How much revenue did Arbitrum report in Q2?").length <= 2);
});
