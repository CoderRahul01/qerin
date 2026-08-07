import { SignJWT, importPKCS8, importJWK, type JWTPayload } from "jose";

// Shared CDP JWT auth for every CDP REST call Qerin makes as a client:
// the x402 facilitator (cdpFacilitator.ts) and the Onramp APIs
// (onramp.ts). Ported from @coinbase/cdp-sdk's own JWT signing
// (node_modules/@coinbase/cdp-sdk/src/auth/utils/jwt.ts), not imported
// from that package directly — its nonce generation depends on the
// `uncrypto` package, which resolves to a dead code path under
// Wrangler's bundler (confirmed by inspecting the bundled Worker output:
// the lazy ESM initializer that wires up `getRandomValues` is never
// actually invoked, so every call throws `TypeError: getRandomValues is
// not a function`). Generating the nonce with the Workers-native
// `crypto.getRandomValues` directly, as done here, sidesteps the bug;
// `jose` itself uses Web Crypto natively and has no such issue.

const SDK_METADATA = {
  sdkLanguage: "typescript",
  source: "qerin-backend",
  sourceVersion: "0.1.0",
};

function nonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function isValidECKey(str: string): Promise<boolean> {
  try {
    await importPKCS8(str, "ES256");
    return true;
  } catch {
    return false;
  }
}

function isValidEd25519Key(str: string): boolean {
  try {
    return Buffer.from(str, "base64").length === 64;
  } catch {
    return false;
  }
}

export interface CdpCredentials {
  apiKeyId: string;
  apiKeySecret: string;
}

interface JwtOptions extends CdpCredentials {
  requestMethod: string;
  requestHost: string;
  requestPath: string;
  expiresIn?: number;
}

export async function generateCdpJwt(options: JwtOptions): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = options.expiresIn ?? 120;
  const randomNonce = nonce();

  const claims: JWTPayload = {
    sub: options.apiKeyId,
    iss: "cdp",
    uris: [`${options.requestMethod} ${options.requestHost}${options.requestPath}`],
  };

  if (await isValidECKey(options.apiKeySecret)) {
    const ecKey = await importPKCS8(options.apiKeySecret, "ES256");
    return new SignJWT(claims)
      .setProtectedHeader({ alg: "ES256", kid: options.apiKeyId, typ: "JWT", nonce: randomNonce })
      .setIssuedAt(now)
      .setNotBefore(now)
      .setExpirationTime(now + expiresIn)
      .sign(ecKey);
  }

  if (isValidEd25519Key(options.apiKeySecret)) {
    const decoded = Buffer.from(options.apiKeySecret, "base64");
    const jwk = {
      kty: "OKP",
      crv: "Ed25519",
      d: decoded.subarray(0, 32).toString("base64url"),
      x: decoded.subarray(32).toString("base64url"),
    };
    const key = await importJWK(jwk, "EdDSA");
    return new SignJWT(claims)
      .setProtectedHeader({ alg: "EdDSA", kid: options.apiKeyId, typ: "JWT", nonce: randomNonce })
      .setIssuedAt(now)
      .setNotBefore(now)
      .setExpirationTime(now + expiresIn)
      .sign(key);
  }

  throw new Error("CDP_API_KEY_SECRET is not a valid EC (PEM) or Ed25519 (base64) key");
}

/**
 * Builds the Authorization + Correlation-Context headers for a single CDP
 * REST call. `host`/`path` must match the actual request exactly — CDP
 * JWTs are bound to a specific "METHOD host+path" claim.
 */
export async function getCdpAuthHeaders(
  credentials: CdpCredentials,
  host: string,
  path: string,
  method: "GET" | "POST" = "POST"
): Promise<Record<string, string>> {
  const jwt = await generateCdpJwt({
    ...credentials,
    requestMethod: method,
    requestHost: host,
    requestPath: path,
  });

  const correlationContext = Object.entries(SDK_METADATA)
    .map(([key, value]) => `${key}=${value}`)
    .join(",");

  return { Authorization: `Bearer ${jwt}`, "Correlation-Context": correlationContext };
}

/**
 * Reads CDP_API_KEY_ID / CDP_API_KEY_SECRET from process.env. Read
 * lazily by callers (never at module scope) — see wallet.ts for why
 * that matters on Workers.
 */
export function getCdpCredentials(): CdpCredentials {
  const apiKeyId = process.env.CDP_API_KEY_ID;
  const apiKeySecret = process.env.CDP_API_KEY_SECRET;

  const missing: string[] = [];
  if (!apiKeyId) missing.push("CDP_API_KEY_ID");
  if (!apiKeySecret) missing.push("CDP_API_KEY_SECRET");
  if (missing.length > 0) {
    throw new Error(`Missing required CDP credentials: ${missing.join(", ")}`);
  }

  return { apiKeyId: apiKeyId!, apiKeySecret: apiKeySecret! };
}
