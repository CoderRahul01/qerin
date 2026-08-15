# Qerin — app code

Two independently deployed packages, per `02-stack-decision.md` / `07-deployment.md`.

## `backend/` — Node/Express, TypeScript

The orchestrator: accepts a question, pays real x402 sources in USDC on **Base mainnet**, synthesizes
an answer via an open-weight model on NVIDIA NIM, returns the answer plus an itemized on-chain receipt.

```
cd apps/backend
cp .env.example .env   # fill in NVIDIA_API_KEY; a wallet key is already generated (see below)
npm run dev             # http://localhost:3001
```

Env vars (`.env`, gitignored):

| Var | Notes |
|---|---|
| `QERIN_WALLET_PRIVATE_KEY` | Dedicated payer wallet, holding a small amount of **real** USDC on Base mainnet (real sources have no testnet equivalent — see below). A fresh one is already generated into `.env`. Regenerate with `node scripts/generate-wallet.mjs`. Never reuse this key elsewhere. |
| `QERIN_NETWORK` | `mainnet` (default) or `testnet`. Testnet only makes sense against `scripts/test-seller.ts` (see below) since the real sources don't have testnet endpoints. |
| `NVIDIA_API_KEY` | Free API key from [build.nvidia.com](https://build.nvidia.com) (NVIDIA Developer Program, no credit card) — used for answer synthesis via NVIDIA NIM's OpenAI-compatible endpoint. Default rate limit is 40 req/min. |
| `QERIN_LLM_MODEL` | Which NIM-hosted open model to use for synthesis. Defaults to `meta/llama-3.3-70b-instruct`; swap to any other model in NVIDIA's catalog (e.g. `nvidia/llama-3.1-nemotron-70b-instruct`, `qwen/qwen2.5-72b-instruct`, `deepseek-ai/deepseek-r1`) without code changes. |
| `PORT` | Defaults to 3001. |

Facilitator: `https://x402.org/facilitator`. Switch to the CDP facilitator (recommended default,
covers 1,000 free tx/month) before a real Demo Day, per `09-verification-and-corrections.md`.

**Real source endpoints** (`src/sources.ts`), confirmed directly against each service's live 402
response (`bazaar` extension — no guessing):

| Source | Endpoint | Price | Notes |
|---|---|---|---|
| CryptoSlate | `POST library.proofivy.com/cryptoslate` | $0.01 | Needs a specific article URL (`content_url`), not a free-text query — no paid search exists. We use CryptoSlate's free public RSS feed to find the most relevant recent article for the question, then pay to unlock its full content. |
| Superhighway | `GET superhighway.walls.sh/search?q=` | $0.001 | Free-text web search. |
| Veles Finance Agent | `POST veles-finance-gateway.fly.dev/ask` | $0.02 | Free-text financial question (`message` field), answered by their own model. |
| Tavily Search | `POST x402.tavily.com/search` | $0.01 | Free-text web search, general-purpose fallback. |
| Otto AI Crypto News | `GET x402.ottoai.services/crypto-news` | $0.001 | Crypto news feed, no query param. |
| Otto AI TradFi Data | `GET x402.ottoai.services/tradfi-data?symbol=` | $0.003 | Needs a ticker symbol extracted from the question. |
| CoinGecko Onchain Search | `GET pro-api.coingecko.com/api/v3/x402/onchain/search/pools?query=` | $0.01 | Free-text DEX pool/token search by name, symbol, or contract address. |
| CoinMarketCap DEX Search | `GET pro-api.coinmarketcap.com/x402/v1/dex/search?q=` | $0.01 | Free-text DEX token search. |
| Messari Signal | `GET api.messari.io/signal/v1/assets?search=` | $0.55 | Crypto asset mindshare rankings with sentiment/momentum context — free-text search. |

All run on **Base mainnet only** — there is no testnet version of any of them.

**Payment proof:** `scripts/test-seller.ts` is a minimal local x402-protected resource (not part of
the shipped product — Qerin is a buyer only) used to prove the buyer-side payment code fires a real,
settled Base Sepolia transaction without depending on third-party source URLs being ready:

Requires temporarily setting `QERIN_NETWORK=testnet` and `QERIN_WALLET_PRIVATE_KEY` to the old
testnet-only key (`0x15772Af4766ADf489E86b94078Ab244122Fa2B7e`, still funded with test USDC):

```
# terminal 1
cd apps/backend
TEST_SELLER_PAYTO=0x... TEST_SELLER_PORT=4021 npx tsx scripts/test-seller.ts

# terminal 2 — hits the local seller through the real paySource() buyer code
QERIN_NETWORK=testnet node -e "import('./dist/paidFetch.js').then(m => m.paySource('Test Seller', 'http://localhost:4021/paid-resource', '0.01').then(console.log))"
```
Confirmed working: real `transferWithAuthorization` (EIP-3009) settlement on Base Sepolia, verified
independently on Basescan.

## `frontend/` — Next.js, TypeScript

The Ask → Paying → Answer → Developer screen flow, reproducing `project/Qerin.dc.html`
pixel-for-pixel, wired to the backend via a server-side API route proxy (`app/api/answer/route.ts`)
so the backend URL never reaches client-side code.

```
cd apps/frontend
npm run dev              # http://localhost:3000
```

Env var: `QERIN_BACKEND_URL` — the backend's URL (e.g. `http://localhost:3001` locally).
