# Qerin — Payment Layer

This is the part of the backend responsible for actually paying x402 
sources. It runs entirely server-side.

## Setup: Qerin's wallet

Qerin needs one wallet that holds USDC on Base Sepolia (testnet, for 
the demo) and pays out from it. This is a standard EVM account, created 
once and funded via a testnet faucet.

```typescript
// wallet.ts
import { privateKeyToAccount } from "viem/accounts";

// In production, load this from a secrets manager, not an env file
// committed to source control. For the demo, a .env value is acceptable
// since this is a testnet-only key with negligible funds.
const privateKey = process.env.QERIN_WALLET_PRIVATE_KEY as `0x${string}`;

export const qerinAccount = privateKeyToAccount(privateKey);
```

Fund this wallet with testnet USDC from a Base Sepolia faucet before 
running any demo. Keep the balance small — a few dollars is enough for 
dozens of demo questions at the price points listed in the pitch.

## Making a paid request to a real x402 source

Using the official `@x402/fetch` wrapper, which handles the full 
402-challenge-then-pay-then-retry flow automatically:

```typescript
// paidFetch.ts
import { wrapFetchWithPayment, decodeXPaymentResponse } from "@x402/fetch";
import { qerinAccount } from "./wallet";

export const fetchWithPayment = wrapFetchWithPayment(fetch, qerinAccount);

export interface PaidResult {
  content: unknown;
  sourceName: string;
  amountPaid: string;
  txHash: string | null;
  timestamp: string;
}

export async function paySource(
  sourceName: string,
  url: string
): Promise<PaidResult> {
  const response = await fetchWithPayment(url, { method: "GET" });
  const body = await response.json();

  const paymentHeader = response.headers.get("x-payment-response");
  const paymentResponse = paymentHeader
    ? decodeXPaymentResponse(paymentHeader)
    : null;

  return {
    content: body,
    sourceName,
    amountPaid: paymentResponse?.amount ?? "unknown",
    txHash: paymentResponse?.transactionHash ?? null,
    timestamp: new Date().toISOString(),
  };
}
```

This is the entire payment mechanic. The wrapper:
1. Makes the initial request
2. Receives a 402 with payment requirements
3. Signs a payment authorization using Qerin's wallet (no gas needed 
   from Qerin directly for the `exact` scheme — settlement is handled 
   via the facilitator)
4. Retries the request with the payment header attached
5. Returns the real content once payment settles

## Calling multiple sources for one question

```typescript
// orchestrator.ts
import { paySource } from "./paidFetch";

const SOURCES = {
  cryptoslate: {
    name: "CryptoSlate",
    urlFor: (query: string) =>
      `https://api.cryptoslate.com/x402/search?q=${encodeURIComponent(query)}`,
  },
  superhighway: {
    name: "Superhighway",
    urlFor: (query: string) =>
      `https://api.superhighway.io/x402/search?q=${encodeURIComponent(query)}`,
  },
  veles: {
    name: "Veles Finance Agent",
    urlFor: (query: string) =>
      `https://api.veles.finance/x402/lookup?q=${encodeURIComponent(query)}`,
  },
};

export async function gatherSources(question: string, sourceKeys: string[]) {
  const selected = sourceKeys.map((key) => SOURCES[key]).filter(Boolean);

  const results = await Promise.allSettled(
    selected.map((source) => paySource(source.name, source.urlFor(question)))
  );

  // Failed sources are dropped, not surfaced as errors to the user —
  // see 08-security-and-limits.md for the fallback behavior
  return results
    .filter((r) => r.status === "fulfilled")
    .map((r) => (r as PromiseFulfilledResult<PaidResult>).value);
}
```

Note: the exact endpoint paths for CryptoSlate, Superhighway, and Veles 
above are illustrative — confirm the real, current paid endpoint URLs 
and query formats from each provider's own docs at build time, since 
these are third-party services that may change their API shape. The 
mechanism (x402 402-challenge-then-pay) is stable; the specific route 
per provider is not something this doc can guarantee stays fixed.

## Source selection logic

For the prototype, source selection can be simple and rule-based rather 
than a full LLM-driven decision:

```typescript
// selectSources.ts
export function selectSources(question: string): string[] {
  const lower = question.toLowerCase();
  const selected: string[] = [];

  if (/\b(stock|filing|sec|earnings|10-k)\b/.test(lower)) {
    selected.push("veles");
  }
  if (/\b(news|happened|today|this week|announced)\b/.test(lower)) {
    selected.push("cryptoslate", "superhighway");
  }

  // Fallback: always query at least one general source
  if (selected.length === 0) {
    selected.push("superhighway");
  }

  return [...new Set(selected)].slice(0, 3); // cap at 3 sources
}
```

This keeps the "agent" logic honest and explainable for a Demo Day 
walkthrough — you can point at this exact function and say precisely 
why a given question triggered a given set of paid calls, which is a 
stronger answer to judge questions than an opaque LLM routing decision.

Current live source list (found via the CDP x402 Bazaar discovery API,
`GET https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources`,
which lists every resource currently registered with the CDP facilitator
along with real usage counts): CryptoSlate, Superhighway, Veles Finance
Agent, Tavily Search, Otto AI Crypto News, Otto AI TradFi Data. See
`apps/backend/src/sources.ts` for the current definitive list and
`apps/backend/src/selectSources.ts` for the routing rules.

## The other direction: Qerin as a seller

Everything above describes Qerin as an x402 **buyer** (paying sources).
The developer-facing paywall flips this: `POST /v1/paid/answer` on the
backend is itself an x402-protected resource, gated by `@x402/hono`'s
payment middleware, requiring the same `$0.15` shown in
`DeveloperScreen.tsx` before the handler runs. No API key, no signup —
the payment itself is the auth, exactly mirroring how Qerin's own
sources treat *it*.

The facilitator client for this direction is `apps/backend/src/cdpFacilitator.ts` —
a small from-scratch reimplementation of `@coinbase/cdp-sdk`'s
`createCdpFacilitatorClient`, not a direct call into that package. Its
JWT-signing dependency (`uncrypto`) resolves to a dead code path under
Cloudflare Workers' bundler (verified by inspecting the bundled Worker
output — the lazy ESM initializer that wires up `getRandomValues` is
never actually invoked), so every facilitator call throws `TypeError:
getRandomValues is not a function`. The reimplementation matches the SDK's
JWT claims shape exactly but generates its nonce with the Workers-native
`crypto.getRandomValues` directly, sidestepping the bug. Developer
payments settle straight into the same wallet address that pays sources
(`QERIN_WALLET_PRIVATE_KEY`) — no separate receiving wallet.

One easy mistake to make in the CDP Portal when setting up
`CDP_API_KEY_ID`/`CDP_API_KEY_SECRET`: new API keys default to the
**Sandbox** environment, which looks visually identical to Production
(same key format, same portal UI) but returns a generic `401
Unauthorized` from every CDP endpoint, with no indication in the error
that the key's environment is the problem. Check for a "Sandbox" badge
next to the account name in the portal before assuming a 401 is a code
bug.

## Consumers: prepaid balance, not a free ride

`POST /v1/paid/answer` only covers developers, who bring their own
crypto wallet. Qerin's own wallet is what pays every source when the
consumer app calls `POST /v1/answer` — that money has to come from
somewhere, and it's not Qerin's to keep floating indefinitely. Every
consumer now funds their own balance first:

1. A random account id is minted client-side (`localStorage`, no
   email/password — see `apps/frontend/src/lib/account.ts`) and sent as
   `X-Qerin-Account-Id` on every request. The id itself is the bearer
   secret, same trust model as an API key.
2. The balance lives in Postgres (`users.balance_usdc`,
   `apps/backend/src/accounts.ts`), not on-chain per user — there's
   still only one wallet that actually holds and spends USDC, same as
   the buyer flow above. This mirrors how an exchange runs one hot
   wallet with an internal ledger.
3. Funding goes through **Razorpay** (`apps/backend/src/razorpay.ts`),
   not crypto — a consumer pays by UPI/card/netbanking directly in an
   embedded Razorpay Checkout modal (`apps/frontend/src/lib/razorpay.ts`),
   no wallet, no exchange account, no crypto exposure at all. The
   backend creates a Razorpay order (`POST /v1/account/topup`), the
   frontend opens Checkout with it, and on success the frontend posts
   the payment id + HMAC signature to `POST /v1/account/topup/confirm`,
   which verifies the signature server-side
   (`hmac_sha256(orderId + "|" + paymentId, RAZORPAY_KEY_SECRET)` must
   match) before crediting anything — confirms synchronously in-browser,
   no polling or webhook needed.
4. `POST /v1/answer` debits `$0.15` (same price as the developer path,
   `ANSWER_PRICE_USD` in `spendGuard.ts`) from the balance before running
   the request, and refunds it if the request fails after the debit (no
   sources responded, spend cap hit) — same "no charge on failure"
   guarantee the free version always had.

**This replaced an earlier Coinbase Onramp integration**, which is why
you may see references to it in older commits or CDP-related code
(`cdpAuth.ts`, `cdpFacilitator.ts` — still used for the x402 facilitator
above, unrelated to funding). Onramp technically worked end-to-end in
testing, but Coinbase's own Onramp production application was rejected
outright ("did not meet the specific requirements needed for compliance
within our program") — not a config issue, a decisive no. The India
bank-account restriction hit during testing
("sending crypto is disabled because you've linked an INR bank account")
was a symptom of the same underlying mismatch: Onramp assumes the payer
has and uses a personal Coinbase account, which doesn't fit a
non-crypto-native retail audience. Razorpay removes that dependency
entirely — consumers never touch crypto.

**Qerin's operational wallet still needs real USDC to pay sources.**
That's now entirely decoupled from consumer payments: Razorpay revenue
settles to Qerin's own bank account, and the business periodically
converts some of it to USDC and moves it into
`QERIN_WALLET_PRIVATE_KEY`'s address through its own means. This is a
manual, ongoing operational step — not automated, not something any
code in this repo does — same spirit as the wallet funding guidance in
`08-security-and-limits.md`.
