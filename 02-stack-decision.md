# Qerin — Stack Decision

> **Update:** two rows below no longer match what's actually built —
> `04-backend-service.md` describes an Express server, but `apps/backend`
> is now a **Hono** app; the LLM row says Claude API, but `synthesize.ts`
> actually calls NVIDIA NIM. And "Hosting" now specifically means
> **Cloudflare Workers**, not Render/Railway/Fly.io — see
> `07-deployment.md` for the reasoning (free tier, no persistent process
> needed since `@neondatabase/serverless` and viem are edge-native) and
> the deploy walkthrough.

## Chosen stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js (React) | Matches the existing Claude Design HTML/React export path most directly; server components make it easy to keep the backend call server-side, hiding API keys |
| Backend/orchestrator | TypeScript, Hono, on Cloudflare Workers | `@x402/hono` has the same middleware support as `@x402/express`; Workers' free tier removes the need for a paid always-on host, since the backend has no state that requires a persistent process |
| Payment layer | `@x402/core`, `@x402/evm`, `@x402/fetch`, `@x402/hono` | Official x402 Foundation packages (the protocol was contributed to the Linux Foundation and is maintained under x402-foundation/x402 on GitHub). `@x402/hono` is also what gates the developer paywall on `POST /v1/paid/answer` — Qerin as an x402 seller, not just a buyer |
| Wallet | Standalone viem private key (`privateKeyToAccount`) | Simplest to demo and to reason about; see `08-security-and-limits.md` for the tradeoff against a CDP Server Wallet |
| Chain | Base mainnet | Real x402 sources (CryptoSlate, Superhighway, Veles, Tavily, Otto AI) only exist on mainnet — there is no testnet equivalent |
| LLM (answer synthesis) | NVIDIA NIM (OpenAI-compatible endpoint) | Free, generous-limit API key from build.nvidia.com, no credit card — not the differentiator of the product, any capable model works |
| Hosting | Vercel (frontend) + Cloudflare Workers (backend, free tier) | No paid subscription required for either; see `07-deployment.md` |
| Receipt proof | Basescan links + on-chain `QerinReceiptRegistry` | Every x402 settlement already produces a real, publicly verifiable transaction hash; the registry additionally aggregates a queryable on-chain record across all answers |

## What was deliberately rejected, and why

**A custom payment/escrow contract.** Not needed. x402's `exact` scheme 
already handles the pay-then-deliver flow with EIP-3009 authorization, 
settled via a facilitator. Building a custom contract would duplicate 
what the protocol already does and adds unnecessary attack surface for 
a prototype stage.

**A custom smart contract for the receipt ledger.** Optional, not 
required (see `05-smart-contract.md` for the case where you might still 
want one). The transaction hash from each x402 payment IS the receipt — 
it's already on-chain and independently verifiable via Basescan. A 
custom contract would only be useful if you want an aggregated, 
queryable on-chain record across all of Qerin's answers (useful later 
for the B2B "audit trail" pitch, not required for the demo).

**Python backend.** x402 has a Python SDK too, but the TypeScript SDK 
is the most actively maintained and has broader framework middleware 
coverage (Express, Fastify, Hono, Next.js) as of the current x402 
Foundation repo. Since the frontend is already React/Next.js, staying 
in TypeScript end-to-end reduces context-switching for a solo build.

**Solana or another chain as primary.** x402 is chain-agnostic and does 
support Solana, but Base carries roughly 85% of x402 transaction volume 
industry-wide, and this is explicitly a Base Batches submission — Base 
is the correct primary chain both technically and for the pitch.

**A general-purpose agent framework (LangChain, etc.).** Not needed for 
this scope. The "agent" behavior here is a fixed, small decision tree 
(which 2-3 sources to query for a given question), not an open-ended 
autonomous agent. Adding a heavy framework would slow the build without 
adding real capability at this stage.

## Package list (for reference, install at build time)

Backend:
```
npm install hono @x402/core @x402/evm @x402/fetch @x402/hono
npm install @base-org/account viem jose
npm install -D wrangler
```

Frontend:
```
npm install next react react-dom
```

Do not install client-side x402 packages in the frontend — the frontend 
never pays anything directly. All payment logic lives in the backend.
