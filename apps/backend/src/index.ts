import { Hono } from "hono";
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
import { createAccount, getBalance, debitBalance, creditBalance } from "./accounts.js";
import { createTopupOrder, verifyAndCreditPayment } from "./razorpay.js";
import { ANSWER_PRICE_USD } from "./spendGuard.js";

interface Bindings {
  RATE_LIMITER: { limit: (opts: { key: string }) => Promise<{ success: boolean }> };
}

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", cors());

app.get("/", (c) => c.json({ status: "ok" }));

async function rateLimit(c: { req: { header: (name: string) => string | undefined }; env: Bindings; json: (body: unknown, status: number) => Response }, next: () => Promise<void>) {
  const ip = c.req.header("cf-connecting-ip") ?? "unknown";
  const { success } = await c.env.RATE_LIMITER.limit({ key: ip });
  if (!success) {
    return c.json({ error: "Too many requests" }, 429);
  }
  return next();
}

app.use("/v1/keys", rateLimit);
app.use("/v1/answer", rateLimit);
app.use("/v1/account/*", rateLimit);

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

// Consumer accounts: anonymous, no email/password — the account id itself
// is the bearer secret (same trust model as an API key). Only reachable
// from Qerin's own frontend (internal-secret gated), which generates and
// stores the id in the browser.
app.post("/v1/account", async (c) => {
  if (!requireInternalSecret(c)) return c.json({ error: "Forbidden" }, 403);

  try {
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
    const balance = await getBalance(accountId);
    if (balance === null) return c.json({ error: "Unknown account" }, 404);
    return c.json({ balance });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Internal error" }, 500);
  }
});

// Creates a Razorpay order for a top-up. The frontend opens Razorpay's
// embedded Checkout with these details and confirms via
// POST /v1/account/topup/confirm once the user completes payment —
// no redirect, no polling, confirms synchronously in-browser.
app.post("/v1/account/topup", async (c) => {
  if (!requireInternalSecret(c)) return c.json({ error: "Forbidden" }, 403);

  const accountId = c.req.header("x-qerin-account-id");
  if (!accountId) return c.json({ error: "X-Qerin-Account-Id header is required" }, 400);

  const body = await c.req.json().catch(() => ({}));
  const amountUsd = Number(body?.amountUsd);
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return c.json({ error: "amountUsd must be a positive number" }, 400);
  }

  try {
    const order = await createTopupOrder(accountId, amountUsd);
    return c.json(order);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Could not start top-up" }, 500);
  }
});

// Verifies Razorpay's payment signature and credits the balance — must
// never credit anything before the signature check passes.
app.post("/v1/account/topup/confirm", async (c) => {
  if (!requireInternalSecret(c)) return c.json({ error: "Forbidden" }, 403);

  const accountId = c.req.header("x-qerin-account-id");
  if (!accountId) return c.json({ error: "X-Qerin-Account-Id header is required" }, 400);

  const body = await c.req.json().catch(() => ({}));
  const { orderId, paymentId, signature } = body ?? {};
  const amountUsd = Number(body?.amountUsd);
  if (
    typeof orderId !== "string" ||
    typeof paymentId !== "string" ||
    typeof signature !== "string" ||
    !Number.isFinite(amountUsd) ||
    amountUsd <= 0
  ) {
    return c.json({ error: "orderId, paymentId, signature, and amountUsd are required" }, 400);
  }

  try {
    const result = await verifyAndCreditPayment(accountId, orderId, paymentId, signature, amountUsd);
    if (!result.verified) {
      return c.json({ error: "Payment signature could not be verified" }, 400);
    }
    return c.json({ balance: result.balance });
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
  const { question } = body ?? {};
  if (!question || typeof question !== "string") {
    return c.json({ error: "question is required" }, 400);
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
    const result = await answerHandler(question, accountId);
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

app.use("/v1/paid/answer", (c, next) => getPaidMiddleware()(c, next));

app.post("/v1/paid/answer", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { question } = body ?? {};
  if (!question || typeof question !== "string") {
    return c.json({ error: "question is required" }, 400);
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
