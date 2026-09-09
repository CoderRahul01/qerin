# QERIN — Autonomous AI Agent with Verifiable On-Chain Micropayments

<p align="center">
  <img src="apps/frontend/public/qerin-mark-orange.png" alt="Qerin Mark" width="72" />
</p>

<p align="center">
  <strong>Real Micropayments. Real Premium Data. Verifiable On-Chain.</strong>
</p>

<p align="center">
  <a href="https://qerin.vercel.app"><img src="https://img.shields.io/badge/Live_App-qerin.vercel.app-f45b00?style=flat-square" alt="Live App" /></a>
  <a href="https://basescan.org/address/0xb35788922a5b9C8938dE8AEDf725b88D26eEEa45#code"><img src="https://img.shields.io/badge/Base_Mainnet-Verified_Contract-0052FF?style=flat-square" alt="Base Verified Contract" /></a>
  <a href="https://scan.botchain.ai"><img src="https://img.shields.io/badge/BOT_Chain-Chain_ID_677-8B5CF6?style=flat-square" alt="BOT Chain" /></a>
  <a href="https://x402.org"><img src="https://img.shields.io/badge/Protocol-x402_Micropayments-black?style=flat-square" alt="x402" /></a>
</p>

---

## What is Qerin?

**Qerin** is an autonomous AI agent engineered for the verifiable intelligence economy. Instead of relying on web scraping or stale training data, Qerin uses the **x402 HTTP micropayment protocol** to pay real USDC/USDT directly to live paywalled publishers (CryptoSlate, Superhighway, Veles Finance Agent).

Every query delivers:
1. **Executive Summary (Verified TL;DR)**: Crisp, high-signal bullet points distilling facts from paid sources.
2. **Claude Code-Style Dynamic Topic Auto-Naming**: Automatically generates structured topic titles that name each chat thread.
3. **Multi-Persona Intelligence**: Tailored breakdowns for:
   - 🛠 **Developers**: Contract addresses, protocol standards, API endpoints, and gas parameters.
   - 🚀 **Founders**: Market size, business models, product strategy, and unit economics.
   - ✍️ **Content Writers**: Editorial narrative hooks and direct publisher citations.
   - 📈 **Traders**: Price catalysts, liquidity impact, sentiment, and volume trends.
4. **Verifiable Research Dossier (PDF Download)**: One-click exportable research report containing cryptographic proof of payment, transaction hashes, and publisher citations.
5. **On-Chain Receipt Registry**: An append-only Solidity audit layer deployed on EVM.

---

## Smart Contracts & Multi-Chain Architecture

Qerin operates natively on EVM networks:

| Network | Chain ID | Contract Address / Status | Explorer |
|---|---|---|---|
| **Base Mainnet** | `8453` | [`0xb35788922a5b9C8938dE8AEDf725b88D26eEEa45`](https://basescan.org/address/0xb35788922a5b9C8938dE8AEDf725b88D26eEEa45#code) | [Basescan](https://basescan.org) |
| **BOT Chain Mainnet** | `677` | Deployment Script: `apps/contracts/script/DeployQerinReceiptRegistryBotChain.s.sol` | [BOT Scan](https://scan.botchain.ai) |

### Contract Verification
The `QerinReceiptRegistry` stores keccak256 hashes of inquiries alongside micro-settlement amounts and source counts, providing cryptographic non-repudiation while preserving privacy.

---

## Monorepo Architecture

```text
qerin/
├── apps/
│   ├── backend/         # Cloudflare Workers monolithic API (Hono, x402, Firebase Firestore REST)
│   │   ├── src/
│   │   │   ├── accounts.ts       # Balance management & atomic credit/debit
│   │   │   ├── answerHandler.ts  # Orchestrates payments, synthesis & receipt generation
│   │   │   ├── apiKeys.ts        # SHA-256 hashed B2B API keys
│   │   │   ├── db.ts             # Zero-dependency, edge-native Firestore client
│   │   │   ├── networks.ts       # Multi-chain network routing (Base & BOT Chain)
│   │   │   ├── synthesize.ts     # Structured synthesis via NVIDIA NIM (Llama 3.3 70B)
│   │   │   └── waitlist.ts       # Idempotent signup management
│   │   └── wrangler.toml
│   │
│   ├── contracts/       # Foundry smart contract workspace
│   │   ├── src/                  # QerinReceiptRegistry.sol
│   │   ├── script/               # Base & BOT Chain deployment scripts
│   │   └── foundry.toml          # RPC endpoints (Base 8453, BOT Chain 677)
│   │
│   └── frontend/        # Next.js 16 (React 19) Dashboard with Dark/Light Mode
│       ├── src/
│       │   ├── app/app/page.tsx  # Main AI Agent Dashboard
│       │   ├── components/       # QerinDashboard, ThemeToggle, TopupModal
│       │   └── lib/              # dossierExport.ts, useQerinAnswer.ts, types.ts
│       └── package.json
│
├── BOT_CHAIN_APPLICATION.md      # Ecosystem Support Program Application Guide
├── Qerin Official Pitch deck.pdf # Official pitch deck
└── package.json
```

---

## Quickstart & Local Development

### Prerequisites
- Node.js >= 20
- Foundry (`forge`)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Backend (Cloudflare Workers)
```bash
cd apps/backend
npm run dev
# Serves on http://localhost:8787
```

### 3. Run Frontend (Next.js Dashboard)
```bash
cd apps/frontend
npm run dev
# Serves on http://localhost:3000/app
```

### 4. Deploy Smart Contracts to BOT Chain
```bash
cd apps/contracts
forge script script/DeployQerinReceiptRegistryBotChain.s.sol:DeployQerinReceiptRegistryBotChain \
  --rpc-url botchain \
  --broadcast \
  --private-key $QERIN_WALLET_PRIVATE_KEY
```

---

## License

MIT License. Developed for the autonomous agent and verifiable compute economy.
