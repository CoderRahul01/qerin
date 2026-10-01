# Qerin Public Launch Readiness

This runbook is the release gate for Qerin's public launch on BOT Chain. Do
not describe a payment, receipt, dashboard value, or user interaction as live
until the corresponding evidence below exists.

## Release Gate

- [ ] Deploy the backend Worker with production secrets: `CDP_API_KEY_ID`,
  `CDP_API_KEY_SECRET`, `CDP_WALLET_SECRET` (per-user Qerin wallets and the
  x402 facilitator), `QERIN_INTERNAL_SECRET`, `FIREBASE_SERVICE_ACCOUNT`,
  `QERIN_TREASURY_ADDRESS`, `QERIN_SOLANA_TREASURY_ADDRESS`, and the LLM keys.
  Set `QERIN_WALLET_ENV` (`mainnet` or `testnet`).
- [ ] Qerin does **not** fund any shared wallet for research. Each user funds
  their own Qerin wallet; their Qerin agent pays sources and the $0.08 fee
  from it. The treasuries only receive fees and never need a balance. The
  Solana treasury must already hold a USDC token account (receive any USDC
  there once), or Solana fees can't settle.
- [ ] Optional: `QERIN_WALLET_PRIVATE_KEY` only signs BOT Chain receipt
  registry writes (tiny BOT gas, non-fatal if empty) and honors legacy
  prepaid credit while it happens to hold USDC.
- [ ] Deploy the frontend with `QERIN_BACKEND_URL`,
  `QERIN_INTERNAL_SECRET`, `NEXT_PUBLIC_REGISTRY_ADDRESS`, and
  `NEXT_PUBLIC_BOTCHAIN_REGISTRY_ADDRESS` set for production.
- [ ] Check `/`, `/app`, `/landing`, `/developers`, and `/rewards` over HTTPS.
- [ ] Connect an injected wallet, add BOT Chain (677), and verify the active
  wallet address changes in the app when the wallet account changes.
- [ ] Create a Qerin wallet, fund it once on Base (from MetaMask) and once on
  Solana (from Phantom). Save the transaction links and confirm the wallet's
  balances match the chain.
- [ ] Set agent limits (signed), withdraw a small amount on each rail, and
  confirm the funds land in the owner's wallet.
- [ ] Run one successful paid query from each rail (Base, Solana). Its
  response must include at least one x402 source transaction AND a settled
  service-fee transaction, both from the user's own Qerin wallet. A source
  that does not return a verifiable settlement is not launch evidence. Before
  promoting Solana, confirm at least one selected source accepts Solana USDC.
- [ ] Keep `/v1/paid/answer` paused until direct x402 charges can be refunded
  automatically when source retrieval or answer delivery fails. The prepaid
  app path is the early-access research flow.
- [ ] Verify the user signs the gasless Qerin account access message before a
  query or one-time pass claim. Connecting the wallet alone must not spend.
- [ ] Confirm any registry receipt transaction in the appropriate explorer.
  If the receipt is pending, do not publish it as an immutable registry proof.

## BOT Chain Assessment Evidence

| Requirement | Evidence to retain |
| --- | --- |
| Social activity | Official Qerin account URL plus links to at least five valid posts in the last 30 days. |
| Mainnet PR | Public announcement URL containing: “Officially launched on BOT Chain Mainnet.” |
| Footer | Screenshot of the live footer showing BOT Chain name/logo, website, and explorer links. |
| Usable product | Screen recording: wallet connect → switch/add BOT Chain → top-up → paid query → receipt/explorer link. |
| Real usage | Three independent wallet addresses and five distinct valid core-function transaction links, all made by real testers. |
| Continuous operation | Uptime checks for the website, app, X account, community, backend Worker, and wallet/top-up path. |

## Dune Validation

The dashboard is only launch-ready after its displayed values reconcile with
the explorer:

1. Record the five test transaction hashes, timestamps, wallet addresses, and
   registry event transaction hashes in a launch spreadsheet.
2. In Dune, filter the dashboard to BOT Chain and the exact registry contract.
3. Compare transaction count, unique-wallet count, and total paid value with
   the evidence sheet. Investigate any mismatch before promotion.
4. Take a dated screenshot of the reconciled dashboard and keep the query URL.

The private operator summary is available directly from the Worker at
`/v1/admin/analytics` with the `X-Qerin-Internal-Secret` header. It shows
wallet users, funded users, research users, top-ups by Base/BOT Chain, and
per-account balances and paid queries. Never expose this endpoint through a
public frontend route or publish its account rows to Dune.

## Launch-Day Smoke Test

1. Load the landing page in an incognito browser and follow every footer link.
2. Connect MetaMask/OKX/Bitget/TokenPocket (or BO Wallet by QR) and create
   the Qerin wallet with one gasless signature.
3. Fund the Qerin wallet with a small amount and wait for the balance to update.
4. Submit a normal research query. Confirm the progress state does not show a
   source as paid unless its receipt has a transaction link.
5. Open the source transaction and registry transaction separately in their
   correct explorers.
6. Export a dossier, then verify its paid source count and amount against the
   response.
7. Repeat with a second browser profile and a second wallet.

## Rollback Rules

- Pause public promotion if wallet connection, Qerin wallet funding,
  paid-source settlement, fee settlement, withdrawals, or receipt links fail.
- Refund or manually credit a query only after confirming no paid x402 source
  settlement occurred.
- Never manufacture tester wallets, transactions, Dune values, or source
  receipts to satisfy an assessment target.

## Repository Test Plan

```bash
cd apps/backend && npm test && npm run typecheck
cd ../frontend && npm run lint && npm run build
cd ../contracts && forge test
```
