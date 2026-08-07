# Qerin — Security and Limits

This covers the practical safety rails for the prototype. This is not 
a full production security audit — it's the minimum sensible set of 
guardrails for a Demo Day build that handles a real wallet, however 
small its balance.

## Wallet safety

- **Mainnet, real USDC — this is live, not a demo wallet.** Real x402
  sources (CryptoSlate, Superhighway, Veles) only exist on Base mainnet,
  so there is no testnet-only path for the real product; every dollar in
  this wallet is real. `08-security-and-limits.md`'s original "testnet
  only" framing no longer applies — see `09-verification-and-corrections.md`.
- **Hard balance cap.** Fund Qerin's wallet with only a small, deliberately
  capped amount of real USDC at a time. This is the primary control that
  bounds financial risk now that testnet's built-in safety net is gone.
- **Private key handling.** The key lives only in the hosting 
  provider's environment variable store (Railway/Render/Fly's secrets 
  manager), never committed to the repository, never logged. If this 
  moves toward production later, migrate to a proper secrets manager 
  or a smart-wallet setup with scoped session keys instead of a raw 
  EOA private key.
- **No key reuse.** The wallet used for this prototype should not be 
  reused for any other project or hold any other funds, so a leak here 
  has no blast radius beyond this specific demo wallet.

## Spend limits

Even though this is testnet, build the habit of a spend cap now — it's 
the same pattern real x402 buyers use in production per the "6 
guardrails" pattern that's standard across serious agent-wallet 
implementations (Coinbase Agentic Wallets, MetaMask Guard Mode, etc.):

```typescript
// spendGuard.ts
const MAX_PER_QUESTION_USDC = 0.5; // hard ceiling per single question
const MAX_DAILY_USDC = 5.0; // rolling daily cap

let dailySpent = 0;
let lastResetDate = new Date().toDateString();

export function checkSpendLimit(estimatedCost: number): boolean {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    dailySpent = 0;
    lastResetDate = today;
  }

  if (estimatedCost > MAX_PER_QUESTION_USDC) return false;
  if (dailySpent + estimatedCost > MAX_DAILY_USDC) return false;

  return true;
}

export function recordSpend(amount: number) {
  dailySpent += amount;
}
```

Call `checkSpendLimit` before invoking `gatherSources` in the backend 
service, and reject the request with a clear error if it fails, rather 
than silently over-spending.

## Failure handling

Real third-party APIs go down or respond slowly, especially small, 
early-stage services like the actual x402 publishers Qerin depends on. 
Handle this explicitly rather than letting a single failed source break 
the whole response:

- `gatherSources` already uses `Promise.allSettled`, so one failed 
  source doesn't block the others (see `03-payment-layer.md`)
- If **all** sources fail, return a clear error and, critically, **do 
  not charge anything** — the x402 flow only completes payment on a 
  successful request/response round trip, so a failed call should 
  never result in a charge in the first place. Confirm this behavior 
  explicitly when testing against each real source before the demo.
- Surface failures honestly in the UI copy, matching the tone already 
  established in the design brief: "CryptoSlate didn't respond. Qerin 
  used 2 other paid sources instead." — not a vague error, not an 
  apology.

## Rate limiting the backend itself

For the public-facing demo endpoint, add basic rate limiting so the 
live demo isn't vulnerable to being hammered by an automated request 
(accidental or otherwise) during Demo Day:

```typescript
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // 10 requests per minute per IP, generous for a live demo
});

app.use("/v1/answer", limiter);
```

## What's explicitly out of scope for this stage

- Full KYC/identity verification of who is calling the API
- Production-grade secrets rotation
- A dedicated monitoring/alerting stack
- DDoS protection beyond basic rate limiting

These are legitimate production concerns but are correctly deferred 
past the Demo Day prototype stage — naming them here as known, deferred 
work is itself a credible signal if asked about production-readiness 
during Q&A.
