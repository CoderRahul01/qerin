# Qerin Public Launch Readiness

This runbook is the release gate for Qerin's public launch on BOT Chain. Do
not describe a payment, receipt, dashboard value, or user interaction as live
until the corresponding evidence below exists.

## Release Gate

- [ ] Deploy the backend Worker with production secrets, including
  `QERIN_INTERNAL_SECRET`, `QERIN_WALLET_PRIVATE_KEY`,
  `QERIN_REGISTRY_ADDRESS_BOTCHAIN`, and the configured LLM/provider keys.
- [ ] Fund Qerin's operational Base wallet with a small USDC float before
  accepting paid queries. The agent cannot settle x402 source payments with
  an empty wallet; verify its public USDC balance and record the funding
  transaction in the launch evidence sheet.
- [ ] Deploy the frontend with `QERIN_BACKEND_URL`,
  `QERIN_INTERNAL_SECRET`, `NEXT_PUBLIC_REGISTRY_ADDRESS`, and
  `NEXT_PUBLIC_BOTCHAIN_REGISTRY_ADDRESS` set for production.
- [ ] Check `/`, `/app`, `/landing`, `/developers`, and `/rewards` over HTTPS.
- [ ] Connect an injected wallet, add BOT Chain (677), and verify the active
  wallet address changes in the app when the wallet account changes.
- [ ] Complete one Base USDC top-up and one BOT Chain USDT or BOT top-up. Save
  the transaction links and confirm the credited balances match the settled
  amounts.
- [ ] Run one successful paid query for each supported settlement rail. Its
  response must include at least one x402 source transaction; a source that
  does not return a verifiable settlement transaction is not launch evidence.
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

## Launch-Day Smoke Test

1. Load the landing page in an incognito browser and follow every footer link.
2. Connect MetaMask/OKX/Bitget/TokenPocket and add BOT Chain from the app.
3. Make a small top-up and wait for on-chain confirmation.
4. Submit a normal research query. Confirm the progress state does not show a
   source as paid unless its receipt has a transaction link.
5. Open the source transaction and registry transaction separately in their
   correct explorers.
6. Export a dossier, then verify its paid source count and amount against the
   response.
7. Repeat with a second browser profile and a second wallet.

## Rollback Rules

- Pause public promotion if wallet connection, top-up confirmation, paid-source
  settlement, or receipt links fail.
- Refund or manually credit a query only after confirming no paid x402 source
  settlement occurred.
- Never manufacture tester wallets, transactions, Dune values, or source
  receipts to satisfy an assessment target.

## Repository Test Plan

```bash
cd apps/backend && npm run typecheck
cd ../frontend && npm run lint && npm run build
cd ../contracts && forge test
```
