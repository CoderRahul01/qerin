# Qerin MCP server (preview)

This package is a preview. It does **not** run paid research through MCP yet. The `qerin_verified_query` tool returns an explicit error and never fabricates an answer or receipt. Use the [Qerin web app](https://qerin.vercel.app/app) for paid research, Direct x402 API billing is paused during early access.

Run a local build with `npm run build` and `npm start`. This repository does not imply that an npm release is available.

## Tools

- `qerin_list_sources` lists source routes and quoted prices. Availability and final charges depend on each provider's live x402 challenge.
- `qerin_verify_receipt` checks a successful on-chain transaction for the `AnswerDelivered` event at a configured Qerin registry. Set `QERIN_REGISTRY_ADDRESS_BASE` or `QERIN_REGISTRY_ADDRESS_BOTCHAIN` for the network you verify. A transaction hash alone is not proof of a paid source.
- `qerin_verified_query` reports that MCP payment support is unavailable.

Source payments currently use Base USDC. User top-ups may use supported Qerin rails; those are separate transactions from source payments and answer receipt records.
