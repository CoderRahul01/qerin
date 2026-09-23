# Dune queries

Ready-to-paste SQL for the public Dune dashboard
(https://dune.com/qerin26/qerin-protocol-autonomous-ai-agent-analytics-bot-chain-hub).

| File | Widget | What it shows |
| --- | --- | --- |
| `01_registry_receipts_daily.sql` | Bar + line | Answers delivered per day and x402 source spend, from `QerinReceiptRegistry` events |
| `02_usdc_topups_daily.sql` | Bar + counter | USDC top-ups into the Qerin wallet, unique payers, cumulative cash in |
| `03_payer_retention.sql` | Table | Each paying wallet, first/last top-up, repeat payer flag |

## Setup

1. In Dune: **New query**, paste a file, run it.
2. For `02` and `03`, set the `qerin_wallet` parameter to the `payTo` address from `GET /v1/network-info`.
3. Add each query's visualization to the dashboard.

## Limits

- These cover **Base mainnet** only. BOT Chain (677) data appears in Dune only if Dune indexes that chain; check the chain list in Dune's data explorer before adding BOT Chain queries.
- On-chain data cannot show LLM cost, free pass credit, or anonymous users. Those live in the private `/admin` dashboard.
