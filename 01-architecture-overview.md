# Qerin — Architecture Overview

This is the technical architecture for Qerin: a service that takes a 
question, pays real x402 micropayments in USDC on Base to live 
publishers/data APIs, retrieves the paid content, and returns a 
synthesized answer with an on-chain, verifiable receipt.

This document is the entry point. See the companion files for detail 
on each layer:

- `02-stack-decision.md` — why this stack, what was rejected and why
- `03-payment-layer.md` — the x402 payment flow, buyer-side implementation
- `04-backend-service.md` — the orchestration/answer service
- `05-smart-contract.md` — optional on-chain receipt registry contract
- `06-frontend-integration.md` — wiring the Claude Design prototype to real data
- `07-deployment.md` — how this goes live for Demo Day, free-tier resources
- `08-security-and-limits.md` — wallet safety, spend caps, failure handling

---

## System shape, in one diagram

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────────────┐
│   Frontend   │─────▶│  Qerin Backend    │─────▶│  x402 Sources        │
│  (Next.js)   │      │  (orchestrator)   │      │  CryptoSlate         │
│              │◀─────│                    │◀─────│  Superhighway        │
└─────────────┘      └──────────┬────────┘      │  Veles Finance Agent │
                                  │                └─────────────────────┘
                                  │
                        ┌─────────▼─────────┐
                        │  Base Account      │
                        │  (Qerin's wallet)  │
                        │  holds USDC        │
                        └─────────┬─────────┘
                                  │
                        ┌─────────▼─────────┐
                        │  Base network       │
                        │  (Sepolia testnet    │
                        │   or mainnet)        │
                        └─────────────────────┘
```

## The four moving parts

1. **Frontend** — the app the person or developer sees (the screens 
   already designed in Claude Design). Talks only to the Qerin backend, 
   never touches a wallet or x402 directly.

2. **Qerin backend** (Hono on Cloudflare Workers — see `07-deployment.md`) — 
   a single service that:
   - Accepts a question, either free (consumer app, internal-secret gated)
     or paid (developers, x402 paywall on `POST /v1/paid/answer` — Qerin
     is a seller here, not just a buyer; see `03-payment-layer.md`)
   - Decides which x402 sources to query
   - Pays each source using x402 client SDKs
   - Retrieves the paid content
   - Synthesizes a short answer
   - Returns the answer plus a structured receipt (source, amount, tx 
     hash, timestamp)

3. **Qerin's wallet** — a Base Account (smart wallet) holding a small 
   amount of USDC, controlled entirely by the backend. This is the 
   wallet that actually pays CryptoSlate, Superhighway, etc. The end 
   user never sees or manages this wallet.

4. **Base network** — where the actual USDC transfers settle and where 
   every transaction hash shown in the Receipt Strip can be 
   independently verified on Basescan.

## Why this shape, briefly

The person or developer using Qerin should never need a wallet, never 
need testnet ETH, never sign a transaction. Qerin is the payer. This 
is what makes it usable by a general audience instead of only 
crypto-native users — and it's what makes the B2B pricing model 
(Asset 8) coherent: a platform embedding Qerin's API is paying Qerin 
in normal fiat/invoice terms, and Qerin is the one paying sources in 
USDC on Base underneath.
