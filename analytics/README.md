# Qerin analytics

Three layers, all free:

| Layer | Where | What you see |
| --- | --- | --- |
| Founder dashboard | `/admin` (private) | Users, cash collected, revenue earned, AI + source spend, gross margin, user journey funnel, daily trends, top accounts, and "what to do next" recommendations |
| Product analytics | PostHog (free tier) | Visitors, traffic sources, pageviews, session replays, funnels and retention on app events |
| On-chain proof | Dune (`analytics/dune/`) | Public, verifiable receipts and USDC top-ups on Base |

## Setup

### 1. Founder dashboard (`/admin`)

Set in the **frontend** deployment (Vercel):

- `QERIN_ADMIN_KEY`: a long random string, for example the output of `openssl rand -hex 32`. Open `/admin` and paste it in.

The backend needs no new env vars. Deploy both apps so `/v1/admin/analytics` exists.

### 2. PostHog

1. Create a free project at posthog.com named **Qerin**, separate from any other product.
2. Set in the frontend deployment:
   - `NEXT_PUBLIC_POSTHOG_KEY`: the project API key (`phc_...`)
   - `NEXT_PUBLIC_POSTHOG_REGION`: `us` (default) or `eu`, matching your project
3. Redeploy. Without the key, nothing is sent.

Events sent from the app (never question text):

| Event | When |
| --- | --- |
| `wallet_connected` | Wallet approved (also identifies the user by wallet address) |
| `free_pass_claimed` | $1.50 pass credited |
| `topup_confirmed` | On-chain top-up verified |
| `query_submitted` / `query_completed` / `query_failed` | Research query lifecycle |
| `insufficient_balance` | User tried to ask with no balance: a direct top-up intent signal |

Suggested PostHog funnel: `wallet_connected` → `free_pass_claimed` → `query_completed` → `insufficient_balance` → `topup_confirmed`.

### 3. Dune

See `analytics/dune/README.md`.

## How the numbers are defined

- **Cash collected**: verified on-chain top-up deposits (`usedDeposits`). Real money.
- **Revenue earned**: price charged per delivered paid query (app and x402 developer API). Part of it is paid with free pass credit.
- **Free pass credit**: $1.50 per claimed pass. Shown separately, never counted as revenue.
- **AI + source spend**: x402 payments to paid sources plus the LLM cost reported by OpenRouter. NVIDIA NIM does not report a cost, so those calls count as $0. Queries recorded before this release have no LLM cost.
- **Gross margin**: revenue earned minus AI + source spend.
