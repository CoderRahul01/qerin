# Qerin Solana Anchor Workspace (`qerin_vault`)

Autonomous AI Agent Escrow with On-Chain Velocity Controls and x402 Micropayment Routing.

## Overview

The `qerin_vault` Anchor program enables non-custodial agent-to-publisher micropayments on Solana:
- **PDA Escrow**: Each user owns an isolated `VaultAccount` PDA seeded by `[b"qerin_vault", owner.key()]`.
- **On-Chain Spend Guardrails**: Strict enforcement of `max_per_query` and `epoch_limit` (e.g. 24h budget) cryptographically verified by the Solana runtime.
- **Split Settlement**: Atomically routes micropayments to publishers while directing protocol fees to the treasury.
- **ZK Compression Ready**: Emits `QuerySettledEvent` containing `query_hash` for off-chain ingestion into Light Protocol state trees.

## Build & Test

```bash
# Build program
anchor build

# Run test suite
anchor test
```
