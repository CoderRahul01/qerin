import test from "node:test";
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import { decodeJwt, decodeProtectedHeader } from "jose";
import { agentWalletName, generateWalletAuthJwt, toJsonSafe } from "../dist/agentWallet.js";

test("agent wallet names are deterministic per owner and valid for CDP", () => {
  const owner = "0xAbCdEf0123456789aBcDeF0123456789abCDef01";
  const name = agentWalletName(owner);
  assert.equal(name, agentWalletName(owner.toLowerCase()));
  assert.match(name, /^[A-Za-z0-9][A-Za-z0-9-]{0,34}[A-Za-z0-9]$/);
  assert.notEqual(name, agentWalletName("0x1111111111111111111111111111111111111111"));
});

test("typed-data bigints are serialized as decimal strings", () => {
  assert.deepEqual(
    toJsonSafe({ message: { value: 10000n, nested: [1n, "x"] }, chainId: 8453 }),
    { message: { value: "10000", nested: ["1", "x"] }, chainId: 8453 }
  );
});

test("wallet auth token is bound to the method, path and request body", async () => {
  const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const secret = privateKey.export({ type: "pkcs8", format: "der" }).toString("base64");
  const path = "/platform/v2/evm/accounts";
  const token = await generateWalletAuthJwt(secret, "POST", path, { name: "qerin-abc", b: 1 });

  assert.equal(decodeProtectedHeader(token).alg, "ES256");
  const claims = decodeJwt(token);
  assert.deepEqual(claims.uris, [`POST api.cdp.coinbase.com${path}`]);
  // reqHash is over the key-sorted body, so key order must not matter.
  assert.equal(claims.reqHash, createHash("sha256").update('{"b":1,"name":"qerin-abc"}').digest("hex"));
  assert.ok(claims.jti && claims.iat && claims.nbf);

  const noBody = decodeJwt(await generateWalletAuthJwt(secret, "POST", path));
  assert.equal(noBody.reqHash, undefined);
});
