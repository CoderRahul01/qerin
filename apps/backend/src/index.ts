import { Hono } from "hono";
import { isAddress } from "viem";
import { cors } from "hono/cors";
import { x402ResourceServer, type RoutesConfig } from "@x402/core/server";
import { registerExactEvmScheme } from "@x402/evm/exact/server";
import { paymentMiddleware } from "@x402/hono";
import type { MiddlewareHandler } from "hono";
import { answerHandler } from "./answerHandler.js";
import { issueApiKey } from "./apiKeys.js";
import { getQerinAccount } from "./wallet.js";
import { getNetwork } from "./networks.js";
import { createQerinCdpFacilitatorClient } from "./cdpFacilitator.js";
import { createAccount, getOrCreateAccount, getBalance, debitBalance, creditBalance, claimEcosystemPass } from "./accounts.js";
import { ANSWER_PRICE_USD, MAX_QUESTION_LENGTH } from "./spendGuard.js";
import { isValidEmail, joinWaitlist } from "./waitlist.js";
import { verifyAndCreditCryptoDeposit, fetchLiveBotPrice } from "./cryptoTopup.js";

interface RateLimiterBinding {
  limit: (opts: { key: string }) => Promise<{ success: boolean }>;
}

interface Bindings {
  RATE_LIMITER: RateLimiterBinding;
  TOPUP_RATE_LIMITER: RateLimiterBinding;
}

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", cors());

app.get("/", (c) => c.json({ status: "ok" }));

type RateLimitContext = {
  req: { header: (name: string) => string | undefined };
  env: Bindings;
  json: (body: unknown, status: number) => Response;
};

// Requests reach this Worker exclusively through Qerin's own Next.js API
// routes (gated separately by requireInternalSecret on every handler below),
// which forward the real visitor IP in X-Qerin-Client-Ip — see
// apps/frontend/src/lib/clientIp.ts. Without that, cf-connecting-ip here is
// Vercel's own egress IP on every request, not the visitor's, so per-IP
// limiting would bucket every user together instead of limiting any one of
// them. Fall back to cf-connecting-ip for direct/manual calls.
function resolveClientIp(c: RateLimitContext): string {
  return c.req.header("x-qerin-client-ip") || c.req.header("cf-connecting-ip") || "unknown";
}

async function rateLimit(c: RateLimitContext, next: () => Promise<void>) {
  const ip = resolveClientIp(c);
  const { success } = await c.env.RATE_LIMITER.limit({ key: ip });
  if (!success) {
    return c.json({ error: "Too many requests" }, 429);
  }
  return next();
}

// Stricter, dedicated bucket for the Ecosystem Pass claim specifically — it
// mints free balance with no on-chain cost to the caller, one click, no
// retries needed. NOT applied to crypto-confirm: that endpoint legitimately
// retries up to CONFIRM_MAX_ATTEMPTS (10) times a few seconds apart while a
// real transaction confirms (see TopupModal.tsx runConfirm), which the
// general 20 req/60s limiter already comfortably covers — a 5-per-10-minute
// bucket would break that retry flow for genuine, paying users.
async function topupRateLimit(c: RateLimitContext, next: () => Promise<void>) {
  const ip = resolveClientIp(c);
  const { success } = await c.env.TOPUP_RATE_LIMITER.limit({ key: ip });
  if (!success) {
    return c.json({ error: "Too many claim attempts — please wait a few minutes and try again" }, 429);
  }
  return next();
}

app.use("/v1/keys", rateLimit);
app.use("/v1/answer", rateLimit);
app.use("/v1/account/*", rateLimit);
app.use("/v1/waitlist", rateLimit);
app.use("/v1/account/topup/demo-claim", topupRateLimit);

// Issuing a key is free and unauthenticated (matches the DeveloperScreen
// "Get API access" button) — it identifies a developer for future
// dashboards, but is no longer what gates or bills a call; see
// /v1/paid/answer below for the real paywall.
app.post("/v1/keys", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const label = typeof body?.label === "string" ? body.label : undefined;

  try {
    const { apiKey, prefix } = await issueApiKey(label);
    return c.json({
      apiKey,
      prefix,
      message: "Store this key now — it will not be shown again.",
    });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Internal error" }, 500);
  }
});

function requireInternalSecret(c: { req: { header: (name: string) => string | undefined } }): boolean {
  const internalSecret = process.env.QERIN_INTERNAL_SECRET;
  return Boolean(internalSecret) && c.req.header("x-qerin-internal-secret") === internalSecret;
}

// Shared by both answer routes. An unbounded question string is both a cost
// vector (every extra character is paid-source query text and LLM input)
// and, on the balance-gated path, ends up hashed into an on-chain receipt —
// bounding it here, before any source is paid, is cheaper than discovering
// the problem downstream.
function validateQuestion(question: unknown): string | null {
  if (!question || typeof question !== "string") return "question is required";
  if (question.trim().length === 0) return "question is required";
  if (question.length > MAX_QUESTION_LENGTH) {
    return `question must be ${MAX_QUESTION_LENGTH} characters or fewer`;
  }
  return null;
}

// Consumer accounts: anonymous, no email/password — the account id itself
// is the bearer secret (same trust model as an API key). Only reachable
// from Qerin's own frontend (internal-secret gated), which generates and
// stores the id in the browser.
app.post("/v1/account", async (c) => {
  if (!requireInternalSecret(c)) return c.json({ error: "Forbidden" }, 403);

  try {
    let walletAddress: string | undefined;
    try {
      const body = await c.req.json();
      if (body?.walletAddress && typeof body.walletAddress === "string") {
        walletAddress = body.walletAddress;
      }
    } catch {}

    if (walletAddress) {
      const account = await getOrCreateAccount(walletAddress);
      return c.json({ accountId: account.accountId, balance: account.balance });
    }

    const accountId = await createAccount();
    return c.json({ accountId });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Internal error" }, 500);
  }
});

app.get("/v1/account/balance", async (c) => {
  if (!requireInternalSecret(c)) return c.json({ error: "Forbidden" }, 403);

  const accountId = c.req.header("x-qerin-account-id");
  if (!accountId) return c.json({ error: "X-Qerin-Account-Id header is required" }, 400);

  try {
    const { balance, passClaimed } = await getOrCreateAccount(accountId);
    return c.json({ balance, passClaimed: Boolean(passClaimed) });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Internal error" }, 500);
  }
});

// Public — everything here (Qerin's wallet address, the chain, the USDC
// contract) is already visible on-chain to anyone; there's nothing to gate.
// Lets the frontend build the USDC transfer without hardcoding addresses
// in two places.
app.get("/v1/network-info", async (c) => {
  const target = c.req.query("network");
  const network = getNetwork(target);
  let botPrice: number | null = null;
  if (network.chainId === 677) {
    try {
      botPrice = await fetchLiveBotPrice();
    } catch {
      botPrice = 12.20;
    }
  }
  return c.json({
    name: network.name,
    payTo: getQerinAccount().address,
    chainId: network.chainId.toString(),
    usdc: network.usdc ?? null,
    usdt: network.usdt ?? null,
    wbot: network.wbot ?? null,
    currency: network.currency,
    rpcUrl: network.rpcUrl,
    botPrice,
  });
});

// Direct on-chain top-up: the consumer sends USDC to Qerin's wallet with
// their own wallet and this just verifies + credits it — see
// cryptoTopup.ts for why the message signature is required alongside the
// tx hash.
app.post("/v1/account/topup/crypto-confirm", async (c) => {
  if (!requireInternalSecret(c)) return c.json({ error: "Forbidden" }, 403);

  const accountId = c.req.header("x-qerin-account-id");
  if (!accountId) return c.json({ error: "X-Qerin-Account-Id header is required" }, 400);

  const body = await c.req.json().catch(() => ({}));
  const { txHash, signature, network: depositNetwork } = body ?? {};
  if (typeof txHash !== "string" || typeof signature !== "string") {
    return c.json({ error: "txHash and signature are required" }, 400);
  }

  try {
    const result = await verifyAndCreditCryptoDeposit(
      accountId,
      txHash as `0x${string}`,
      signature as `0x${string}`,
      typeof depositNetwork === "string" ? depositNetwork : undefined
    );
    if (!result.verified) {
      return c.json({ error: result.reason ?? "Could not verify this transaction" }, 400);
    }
    return c.json({ balance: result.balance });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Internal error" }, 500);
  }
});

// Ecosystem & Reviewer Fuel Pass: STRICTLY ONE-TIME per individual user/wallet.
// Allows evaluators, grant committees, and developers to activate an initial $1.50
// Protocol Research Fuel to experience autonomous multi-source research.
app.post("/v1/account/topup/demo-claim", async (c) => {
  if (!requireInternalSecret(c)) return c.json({ error: "Forbidden" }, 403);

  const accountId = c.req.header("x-qerin-account-id");
  if (!accountId) return c.json({ error: "X-Qerin-Account-Id header is required" }, 400);

  // Gate the free pass to a real connected wallet address. accountId is
  // otherwise a client-minted random UUID (see normalizeAccountId) that
  // costs nothing to regenerate — without this check, clearing localStorage
  // or opening an incognito window would re-unlock the $1.50 pass forever,
  // breaking "strictly one-time per individual user."
  if (!isAddress(accountId.trim())) {
    return c.json({
      error: "Connect your wallet to claim the Ecosystem Review Pass.",
    }, 400);
  }

  try {
    const result = await claimEcosystemPass(accountId, 1.50);
    if (result.alreadyClaimed) {
      return c.json({
        error: "Ecosystem Review Pass has already been claimed for this account. Pass is strictly one-time per individual user.",
        alreadyClaimed: true,
        balance: result.balance,
      }, 409);
    }
    return c.json({ balance: result.balance, credited: 1.50, alreadyClaimed: false });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Internal error" }, 500);
  }
});

// Free-app path: gated by the internal secret (only Qerin's own frontend
// can reach it) AND a prepaid balance — the consumer paywall. Debits
// ANSWER_PRICE_USD before running the request, refunds it if the request
// fails after the debit (spend cap hit, no sources responded).
app.post("/v1/answer", async (c) => {
  if (!requireInternalSecret(c)) return c.json({ error: "Forbidden" }, 403);

  const accountId = c.req.header("x-qerin-account-id");
  if (!accountId) return c.json({ error: "X-Qerin-Account-Id header is required" }, 400);

  const body = await c.req.json().catch(() => ({}));
  const { question, network } = body ?? {};
  const questionError = validateQuestion(question);
  if (questionError) {
    return c.json({ error: questionError }, 400);
  }

  let balanceAfterDebit: number | null;
  try {
    balanceAfterDebit = await debitBalance(accountId, ANSWER_PRICE_USD);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Internal error" }, 500);
  }

  if (balanceAfterDebit === null) {
    const balance = (await getBalance(accountId).catch(() => null)) ?? 0;
    return c.json(
      { error: "insufficient_balance", message: "Top up your balance to keep asking questions.", balance, required: ANSWER_PRICE_USD },
      402
    );
  }

  // Debit succeeded — from here on, any failure must refund it.
  try {
    const result = await answerHandler(question, accountId, typeof network === "string" ? network : undefined);
    if (result.status !== 200) {
      await creditBalance(accountId, ANSWER_PRICE_USD);
    }
    return c.json(result.status === 200 ? { ...result.body, balance: balanceAfterDebit } : result.body, result.status);
  } catch (err) {
    console.error(err);
    await creditBalance(accountId, ANSWER_PRICE_USD).catch(() => {});
    return c.json({ error: "Internal error" }, 500);
  }
});

// Public marketing signup — no internal-secret gate (reachable directly from
// the homepage, not just Qerin's app frontend), rate-limited to deter spam.
app.post("/v1/waitlist", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = body?.email;
  if (!isValidEmail(email)) {
    return c.json({ error: "A valid email is required" }, 400);
  }

  try {
    const { joined } = await joinWaitlist(email);
    return c.json({ joined });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Internal error" }, 500);
  }
});

// Paid path: the public developer API. Payment is the auth — no signup,
// no key. Mirrors exactly how paidFetch.ts pays Qerin's own sources, just
// with Qerin as the seller instead of the buyer. Requires CDP_API_KEY_ID /
// CDP_API_KEY_SECRET (facilitator auth); payTo points straight at Qerin's
// existing wallet address, so no separate CDP wallet is provisioned.
//
// Built lazily on the first request rather than at module scope: it reads
// process.env (via createQerinCdpFacilitatorClient and getQerinAccount/getNetwork),
// which Workers only populates once a request is being handled — see
// wallet.ts for the full explanation.
let paidMiddleware: MiddlewareHandler | null = null;

function getPaidMiddleware(): MiddlewareHandler {
  if (!paidMiddleware) {
    const facilitator = createQerinCdpFacilitatorClient();
    const resourceServer = new x402ResourceServer(facilitator);
    registerExactEvmScheme(resourceServer);

    const paidRoutes: RoutesConfig = {
      "/v1/paid/answer": {
        accepts: {
          scheme: "exact",
          payTo: getQerinAccount().address,
          price: "$0.15",
          network: getNetwork().caip2,
        },
        description: "Qerin verified answer: a synthesized, sourced answer with an on-chain receipt.",
      },
    };

    paidMiddleware = paymentMiddleware(paidRoutes, resourceServer);
  }
  return paidMiddleware;
}

app.use("/v1/paid/answer", rateLimit);
app.use("/v1/paid/answer", (c, next) => getPaidMiddleware()(c, next));

app.post("/v1/paid/answer", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { question } = body ?? {};
  const questionError = validateQuestion(question);
  if (questionError) {
    return c.json({ error: questionError }, 400);
  }

  try {
    const result = await answerHandler(question);
    return c.json(result.body, result.status);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Internal error" }, 500);
  }
});

export default app;
