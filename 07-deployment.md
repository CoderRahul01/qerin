# Qerin — Deployment (Live on Base Mainnet)

Qerin runs for real: `apps/backend` defaults to Base **mainnet**
(`QERIN_NETWORK=mainnet` in `networks.ts`), pays real x402 sources with
real USDC, and — once `apps/contracts/QerinReceiptRegistry.sol` is deployed —
logs every delivered answer on-chain. This is no longer a testnet-only
demo-day path; treat every credential and balance below as real value.

`apps/backend` is a **Hono app deployed to Cloudflare Workers**, not the
Express/Railway-Render-Fly setup earlier drafts of this doc described —
see `02-stack-decision.md` for the reasoning (free tier, no persistent
process needed since `@neondatabase/serverless` and viem are both
edge-native).

## Frontend

**Vercel**, connected to `github.com/CoderRahul01/qerin` (private) — a
standard Next.js App Router app, deploys automatically on every push to
`main`. The Vercel project's Root Directory is set to `apps/frontend`
since this is a monorepo. Manual deploys still work the same way:

```bash
npm install -g vercel
cd apps/frontend
vercel deploy
```

Set these in Vercel's project settings:

```
QERIN_BACKEND_URL=<your deployed backend's *.workers.dev URL>
QERIN_INTERNAL_SECRET=<matches the same-named secret set on the backend below>
NEXT_PUBLIC_APP_URL=<this Vercel deployment's own URL>
BASE_APP_ID=<issued by the Base Build dashboard once the domain is registered>
NEXT_PUBLIC_REGISTRY_ADDRESS=<QerinReceiptRegistry address, once deployed>
BASE_ACCOUNT_ASSOCIATION_HEADER=<from Base Build domain verification>
BASE_ACCOUNT_ASSOCIATION_PAYLOAD=<from Base Build domain verification>
BASE_ACCOUNT_ASSOCIATION_SIGNATURE=<from Base Build domain verification>
```

## Backend — Cloudflare Workers

```bash
cd apps/backend
npm install
npx wrangler login          # one-time, opens a browser to authorize
npx wrangler deploy
```

This prints the deployed `https://qerin-backend.<your-subdomain>.workers.dev`
URL — that's what goes in the frontend's `QERIN_BACKEND_URL` above. No
custom domain is required to ship; Cloudflare's free tier serves
production traffic fine on the default `workers.dev` subdomain. Attach a
custom domain later (e.g. `api.<yourdomain>`) via the Workers dashboard's
"Custom Domains" tab, or `wrangler.toml`'s `routes` field, once you own
one — no code changes needed either way.

Set secrets on the Worker (never committed — see
`apps/backend/.dev.vars.example` for the full annotated list and what
each one is used for):

```bash
npx wrangler secret put QERIN_WALLET_PRIVATE_KEY   # mainnet key, small balance only
npx wrangler secret put CDP_API_KEY_ID              # CDP facilitator auth (buyer + seller side)
npx wrangler secret put CDP_API_KEY_SECRET
npx wrangler secret put NVIDIA_API_KEY
npx wrangler secret put QERIN_INTERNAL_SECRET        # `openssl rand -hex 32`; must match the frontend's copy
npx wrangler secret put QERIN_REGISTRY_ADDRESS       # once the registry contract is deployed
npx wrangler secret put DATABASE_URL                 # Neon Postgres connection string
```

`QERIN_NETWORK` and `QERIN_LLM_MODEL` are non-secret and already set as
`[vars]` in `wrangler.toml` — edit that file directly rather than using
`wrangler secret put` for those two.

## On-chain receipt registry

`apps/contracts/QerinReceiptRegistry.sol` (Foundry). Deploy once to Base
mainnet:

```bash
cd apps/contracts
forge script script/DeployQerinReceiptRegistry.s.sol \
  --rpc-url https://mainnet.base.org --account deployer --broadcast \
  --sig "run(address)" <qerin-backend-wallet-address>
```

Then set `QERIN_REGISTRY_ADDRESS` (backend) and
`NEXT_PUBLIC_REGISTRY_ADDRESS` (frontend) to the deployed address, and
verify the contract on Basescan so the source is publicly readable —
this is the on-chain artifact worth pointing grant reviewers at.

## Base RPC

- Mainnet: `https://mainnet.base.org` (public, free) — a dedicated RPC
  provider (Alchemy, Infura, Coinbase Developer Platform) is worth adding
  as a fallback once there's real production traffic.
- Base Sepolia (`https://sepolia.base.org`) remains useful for local
  regression testing against `apps/backend/scripts/test-seller.ts`, which
  simulates a paid resource — it is not part of what ships.

## x402 facilitator

Use the CDP facilitator (`https://api.cdp.coinbase.com/platform/v2/x402`)
for mainnet — it's the recommended default and covers Base, Base Sepolia,
Polygon, Arbitrum, and more, with 1,000 free transactions/month. The
no-signup fallback at `https://x402.org/facilitator` is testnet-only.

The same `CDP_API_KEY_ID`/`CDP_API_KEY_SECRET` credentials also authenticate
Qerin's **seller**-side facilitator calls (`src/cdpFacilitator.ts`) for the
developer paywall on `POST /v1/paid/answer` — get a CDP API key from
https://portal.cdp.coinbase.com if you don't already have one. Developer
payments settle straight into `QERIN_WALLET_PRIVATE_KEY`'s address, the
same wallet that pays sources — no separate receiving wallet is
provisioned.

Note: `src/cdpFacilitator.ts` is a small from-scratch reimplementation of
`@coinbase/cdp-sdk`'s `createCdpFacilitatorClient`, not a call into that
package — its JWT signing depends on the `uncrypto` npm package, which
resolves to a dead code path under Wrangler's bundler (confirmed by
inspecting the bundled Worker output: the lazy ESM initializer that sets
up `getRandomValues` is never invoked, so every facilitator call throws
`TypeError: getRandomValues is not a function`). The reimplementation
uses the same JWT claims shape but generates its nonce with the
Workers-native `crypto.getRandomValues` directly.

## Pre-launch checklist

- [ ] Backend deployed (`wrangler deploy`) and responding to a health
      check (`GET /`) on its `*.workers.dev` URL
- [ ] Qerin's wallet funded with a small, deliberately capped amount of
      real USDC (source payments + developer paywall receipts) and a
      small amount of ETH (gas for the registry write) — see
      `08-security-and-limits.md`
- [ ] `CDP_API_KEY_ID` / `CDP_API_KEY_SECRET` set as Worker secrets —
      required for both outbound source payments and the inbound
      `/v1/paid/answer` paywall
- [ ] `QERIN_INTERNAL_SECRET` set identically on both the backend (Worker
      secret) and the frontend (Vercel env var) — the consumer app's
      `/v1/answer` calls fail closed (403) if these don't match
- [ ] `DATABASE_URL` pointed at the live Neon project, `api_keys` /
      `answer_requests` tables present
- [ ] `QerinReceiptRegistry` deployed and verified on Basescan,
      `QERIN_REGISTRY_ADDRESS` / `NEXT_PUBLIC_REGISTRY_ADDRESS` set
- [ ] Confirm each real x402 source endpoint (CryptoSlate, Superhighway,
      Veles, Tavily, Otto AI Crypto News, Otto AI TradFi Data) is
      currently live and responding — third-party API uptime is out of
      your control; re-check periodically via the CDP x402 Bazaar
      (`GET https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources`)
- [ ] Pay `/v1/paid/answer` once for real with a funded test wallet
      (`@x402/fetch` + a small amount of USDC) and confirm the payment
      settles and the answer/receipt come back
- [ ] Frontend deployed and pointed at the real backend URL, not
      `localhost`
- [ ] Base Build dashboard: production domain registered, `base:app_id`
      meta tag verified, `farcaster.json` manifest reachable at
      `/.well-known/farcaster.json`
- [ ] Test the full flow end to end against the live URLs, not just
      locally, within a few hours of any presentation or launch
