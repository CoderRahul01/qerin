import { Hono } from "hono";
import { isAddress } from "viem";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { answerHandler } from "./answerHandler.js";
import { getQerinAccount } from "./wallet.js";
import { paidSourcesReady } from "./payerReadiness.js";
import { verifyAccountProof } from "./accountProof.js";
import { getNetwork } from "./networks.js";
import { createAccount, getOrCreateAccount, getBalance, debitBalance, creditBalance, claimEcosystemPass, getRewardsSummary } from "./accounts.js";
import { ANSWER_PRICE_USD, MAX_QUESTION_LENGTH } from "./spendGuard.js";
import { isValidEmail, joinWaitlist } from "./waitlist.js";
import { verifyAndCreditCryptoDeposit, fetchLiveBotPrice } from "./cryptoTopup.js";
import { getPublicAnalytics, getPrivateAnalytics } from "./analytics.js";
import { getChatHistory, isValidChatVaultId, saveChatHistory } from "./chatHistory.js";

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

// Public aggregate protocol-growth data for the investor/community dashboard.
// It contains no wallet addresses, questions, balances, or API keys.
app.get("/v1/analytics", async (c) => {
  try {
    return c.json(await getPublicAnalytics());
  } catch (err) {
    console.error("Could not build public analytics:", err);
    return c.json({ error: "Analytics are temporarily unavailable" }, 503);
  }
});

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
app.use("/v1/history", rateLimit);
app.use("/v1/waitlist", rateLimit);
app.use("/v1/account/topup/demo-claim", topupRateLimit);

// Keys issued by earlier previews never authorized paid calls. Stop creating
// credentials that appear functional but cannot be used for research.
app.post("/v1/keys", (c) => c.json({ error: "API keys are not available. Use the x402 paid endpoint or Qerin web app." }, 410));

// Free-tier rewards summary endpoint — reads existing account doc directly
app.get("/v1/rewards/:accountId", async (c) => {
  if (!requireInternalSecret(c)) return c.json({ error: "Forbidden" }, 403);
  const accountId = c.req.param("accountId");
  if (!accountId) return c.json({ error: "accountId required" }, 400);

  try {
    const summary = await getRewardsSummary(accountId);
    return c.json(summary);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Internal error" }, 500);
  }
});

function requireInternalSecret(c: { req: { header: (name: string) => string | undefined } }): boolean {
  const internalSecret = process.env.QERIN_INTERNAL_SECRET;
  return Boolean(internalSecret) && c.req.header("x-qerin-internal-secret") === internalSecret;
}

app.get("/v1/admin/analytics", async (c) => {
  if (!requireInternalSecret(c)) return c.json({ error: "Forbidden" }, 403);
  try {
    return c.json(await getPrivateAnalytics());
  } catch (err) {
    console.error("Could not build private analytics:", err);
    return c.json({ error: "Analytics are temporarily unavailable" }, 503);
  }
});

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

// Private, browser-scoped research history. The vault identifier is a random
// UUID generated and retained only by the user's browser; it is intentionally
// not their public wallet address. Every request remains internal-secret
// gated, so this worker is never exposed as an unauthenticated history API.
function getChatVaultId(c: { req: { header: (name: string) => string | undefined } }): string | null {
  const vaultId = c.req.header("x-qerin-chat-vault-id");
  return isValidChatVaultId(vaultId) ? vaultId : null;
}

app.get("/v1/history", async (c) => {
  if (!requireInternalSecret(c)) return c.json({ error: "Forbidden" }, 403);
  const vaultId = getChatVaultId(c);
  if (!vaultId) return c.json({ error: "A valid chat vault is required" }, 400);

  try {
    return c.json({ history: await getChatHistory(vaultId) });
  } catch (err) {
    console.error("Could not load chat history:", err);
    return c.json({ error: "Chat history is temporarily unavailable" }, 503);
  }
});

app.put("/v1/history", async (c) => {
  if (!requireInternalSecret(c)) return c.json({ error: "Forbidden" }, 403);
  const vaultId = getChatVaultId(c);
  if (!vaultId) return c.json({ error: "A valid chat vault is required" }, 400);

  try {
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== "object") return c.json({ error: "A chat history payload is required" }, 400);
    const history = await saveChatHistory(vaultId, body);
    return c.json({ history });
  } catch (err) {
    console.error("Could not save chat history:", err);
    return c.json({ error: "Chat history could not be saved" }, 503);
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
      botPrice = null;
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
    paidSourcesReady: await paidSourcesReady(),
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
  if (!(await verifyAccountProof(accountId, c.req.header("x-qerin-account-proof")))) {
    return c.json({ error: "Sign in with this wallet to claim its Qerin credit." }, 401);
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
  if (!(await verifyAccountProof(accountId, c.req.header("x-qerin-account-proof")))) {
    return c.json({ error: "Sign in with this wallet before using its Qerin balance. No charge was made." }, 401);
  }
  const chatVaultId = getChatVaultId(c);
  if (!chatVaultId) return c.json({ error: "A valid chat vault is required" }, 400);

  const body = await c.req.json().catch(() => ({}));
  const { question, network } = body ?? {};
  const questionError = validateQuestion(question);
  if (questionError) {
    return c.json({ error: questionError }, 400);
  }

  if (!(await paidSourcesReady())) {
    return c.json({
      error: "paid_sources_unavailable",
      message: "Paid research is temporarily unavailable while Qerin's source wallet is replenished. Your balance was not charged.",
    }, 503);
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

  // Debit succeeded — from here on, any failure must refund it. Streamed as
  // SSE so the client can render real pipeline progress (which sources
  // actually settled, when synthesis actually started) instead of a
  // decorative loop — every event below fires exactly when the thing it
  // describes happens. The refund/response-shape contract is unchanged from
  // the old plain-JSON version: a non-200 result (or a thrown error) always
  // refunds before anything is sent back, only now as a terminal SSE event
  // instead of an HTTP status+body.
  return streamSSE(c, async (stream) => {
    try {
      const result = await answerHandler(
        question,
        accountId,
        typeof network === "string" ? network : undefined,
        (event) => {
          stream.writeSSE({ event: "progress", data: JSON.stringify(event) }).catch(() => {});
        },
        chatVaultId,
        (task) => c.executionCtx.waitUntil(task)
      );
      if (result.status !== 200) {
        await creditBalance(accountId, ANSWER_PRICE_USD);
        await stream.writeSSE({ event: "error", data: JSON.stringify(result.body) });
        return;
      }
      await stream.writeSSE({
        event: "done",
        data: JSON.stringify({ ...result.body, balance: balanceAfterDebit }),
      });
    } catch (err) {
      console.error(err);
      await creditBalance(accountId, ANSWER_PRICE_USD).catch(() => {});
      await stream.writeSSE({ event: "error", data: JSON.stringify({ error: "Internal error" }) }).catch(() => {});
    }
  });
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

// Direct x402 billing settles before the answer is generated. Until failed
// delivery can be refunded automatically, keep this path closed so a caller
// cannot be charged for a source failure. The prepaid app route above refunds
// failed answers and remains the early-access research path.
app.post("/v1/paid/answer", (c) => c.json({
  error: "direct_api_unavailable",
  message: "Direct x402 API access is paused during early access. Use the Qerin web app.",
}, 503));

export default app;
