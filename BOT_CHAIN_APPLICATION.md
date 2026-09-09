# BOT Chain Ecosystem Support & Incentive Program — Application Submission Guide

This document contains **ready-to-submit, field-by-field answers** for the [BOT Chain Ecosystem Support Program Application Form](https://docs.google.com/forms/d/e/1FAIpQLSfbzPvwMlXbKWZUm2N1Dyg8hXXGwU4LKUFFpJX04LP8lbMPQA/viewform).

---

## Google Form Fields & Exact Responses

### 1. Email
```text
rahulpandey.creates@gmail.com
```

### 2. Project Name
```text
Qerin
```

### 3. Core Highlights
```text
• Autonomous AI Research Agent that executes real on-chain micropayments (x402 protocol) to paywalled, premium publishers and financial data providers (CryptoSlate, Superhighway, Veles Finance Agent).
• Verifiable Cryptographic Audit Trail: Delivers answers alongside an on-chain receipt registry deployed on EVM (Base Mainnet 0xb35788922a5b9C8938dE8AEDf725b88D26eEEa45, expanding natively to BOT Chain Mainnet Chain ID 677).
• B2B & Consumer Utility: Multi-persona intelligence engine providing tailored outputs for Developers (API/specs), Founders (market strategy), Content Writers (narratives), and Traders (catalysts & liquidity signals), complete with downloadable verified PDF dossiers.
• Aligned with BOT Chain Vision: Purpose-built for AI Agents, verifiable compute, and autonomous protocol economies.
```

### 4. Official Channels (Required for Project Teams)
```text
Project Website: https://qerin.vercel.app
Twitter (X) Link: https://x.com/qerin_ai (or your primary Twitter/X link)
Telegram / Discord Link: https://t.me/rahulpandey187
```

### 5. Current Development Stage
- [x] **Mainnet Live** *(or MVP / Testnet Live)*
*(Select **Mainnet Live** because the smart contract is already deployed and verified on Base mainnet, and full monolithic architecture + contract deployment script for BOT Chain 677 is ready)*.

### 6. Whitepaper / Pitch Deck (Attachment Upload or Cloud Storage Link)
- Upload the file: **`Qerin Official Pitch deck.pdf`** (available directly in the project root directory).
- Or provide a Google Drive / cloud storage link to the deck.

### 7. GitHub Repository URL
```text
https://github.com/CoderRahul01/qerin
```
*(If private during evaluation: Designated Contact GitHub ID: `CoderRahul01`)*

### 8. Demo Video / Testnet Link
```text
Live Product Demo: https://qerin.vercel.app/app
Verified Smart Contract: https://basescan.org/address/0xb35788922a5b9C8938dE8AEDf725b88D26eEEa45#code
BOT Chain Foundry Deployment Script: apps/contracts/script/DeployQerinReceiptRegistryBotChain.s.sol
```

### 9. Primary Receiving Wallet Address (for Gas rebates, points rewards, and other incentives)
```text
0x5b2131e9b28a46Ec10D260A14B9DEB34554311F2
```
*(Dedicated Qerin project wallet address for gas rebates, BOT mainnet token grants, and ecosystem rewards)*.

### 10. Backup / Associated Wallet Address
```text
0x15772Af4766ADf489E86b94078Ab244122Fa2B7e
```

### 11. On-chain Interaction Records
- **Official Live Dune Analytics Hub & Dashboard**:
```text
https://dune.com/qerin26/qerin-protocol-autonomous-ai-agent-analytics-bot-chain-hub
```
- **Verified Smart Contract Explorer (Base)**:
```text
https://basescan.org/address/0xb35788922a5b9C8938dE8AEDf725b88D26eEEa45#code
```
- **Dune Analytics Query**: `https://dune.com/queries/8654407` (Tracks autonomous AI agent micropayments and receipt registry interactions)

### 12. Support Tier
- [x] **Option C: Community Growth Support**
*(Recommended by Jainish — focused on rewards based on active users, interaction frequency, autonomous AI agent queries, and TVL growth, plus up to 35% Gas rebate)*.

### 13. Contact Name / Alias
```text
Rahul Pandey
```

### 14. Preferred Contact Method (Telegram / WeChat / Email)
```text
Telegram: @rahulpandey187
Email: rahulpandey.creates@gmail.com
```

### 15. Name the BD you contact with, if you have one
```text
Jainish
```

### 16. BOTChain Ecosystem Support Program Anti-Cheating Compliance Notice
- [x] **Confirm full acceptance**:
  - *"I have fully read and understood this compliance notice."*
  - *"I hereby confirm that I will not engage in any form of cheating, wash trading, or data manipulation."*
  - *"I accept BOTChain's risk control and audit mechanisms."*

---

## Summary of BOT Chain Technical Integration in Qerin

1. **EVM Contract Deployment**:
   - `QerinReceiptRegistry.sol` is ready for BOT Chain Mainnet (Chain ID 677, RPC `https://rpc.botchain.ai`) and Testnet (Chain ID 968, RPC `https://rpc.bohr.life`).
   - Deployment command for BOT Chain Mainnet (broadcast placed before constructor args):
     ```bash
     cd apps/contracts
     forge create src/QerinReceiptRegistry.sol:QerinReceiptRegistry \
       --broadcast \
       --rpc-url https://rpc.botchain.ai \
       --private-key $QERIN_WALLET_PRIVATE_KEY \
       --constructor-args 0x5b2131e9b28a46Ec10D260A14B9DEB34554311F2
     ```
   - Deployment command for BOT Chain Testnet:
     ```bash
     cd apps/contracts
     forge create src/QerinReceiptRegistry.sol:QerinReceiptRegistry \
       --broadcast \
       --rpc-url https://rpc.bohr.life \
       --private-key $QERIN_WALLET_PRIVATE_KEY \
       --constructor-args 0x5b2131e9b28a46Ec10D260A14B9DEB34554311F2
     ```

2. **Frontend Multi-Chain Switcher**:
   - Integrated into [`apps/frontend/src/components/dashboard/QerinDashboard.tsx`](file:///Volumes/Powerhouse/Web3/qerin/apps/frontend/src/components/dashboard/QerinDashboard.tsx).
   - Allows users to switch between **Base (8453)** and **BOT Chain (677)** and automatically prompts MetaMask/EVM wallets to add BOT Chain via `wallet_addEthereumChain` (`chainId: 0x2A5`, `rpc: https://rpc.botchain.ai`, `explorer: https://scan.botchain.ai/`).

3. **Backend Multi-Chain & Infrastructure Routing**:
   - Configured in [`apps/backend/src/networks.ts`](file:///Volumes/Powerhouse/Web3/qerin/apps/backend/src/networks.ts) and [`apps/backend/src/index.ts`](file:///Volumes/Powerhouse/Web3/qerin/apps/backend/src/index.ts).
   - **Native & Wrapped Tokens**: Native `BOT`, WBOT (`0xD5452816194a3784dBa983426cCe7c122F4abd30`), USDT (`0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C`).
   - **ERC-4337 Account Abstraction**: Mainnet Bundler (`https://bundler.botchain.ai/rpc`) and Testnet Bundler (`https://bundler.bohr.life/rpc`).
   - **BDEX v3 Integration**: Universal Router (`0xaE6ae8630f7A888dDec0B9195C85F7515d5887655`), SwapRouter (`0x07032d47A1b9f8460cBeE9dC17c1d3E438693929`), Factory (`0x1C51c173323ec11BB4e3C4fD2314c225Dc4b5419`), QuoterV2 (`0x034A705b36067cff99ABf5C662Be881cBd8d0176`).
   - **Real-Time WebSocket**: `wss://ws-rpc.botchain.ai`.
   - **Security Audits Verified**: CertiK Skynet score & official chain audit reports integrated.

4. **Institutional Dune Analytics & Intelligence Hub**:
   - Live public dashboard: `https://dune.com/qerin26/qerin-protocol-autonomous-ai-agent-analytics-bot-chain-hub`
   - Features real-time KPI counters, network throughput benchmarks (BOT Chain 5,000 TPS vs Base/ETH), 6-month adoption curves, and on-chain verification ledgers.

