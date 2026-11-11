# @qerin/solana-agent-kit

Autonomous verified data procurement and x402 micropayments for Solana AI Agents.

## Installation

```bash
npm install @qerin/solana-agent-kit
```

## Usage

```typescript
import { QerinVerifiedIntelligenceTool } from "@qerin/solana-agent-kit";

const tool = new QerinVerifiedIntelligenceTool();

const result = await tool.execute({
  query: "What are the latest security audits on Solana Token Extensions?",
  maxBudgetUsdc: 0.08,
});

console.log(result.executiveSummary);
console.log(result.sourcesPaid);
console.log(result.verifiableReceiptHash);
```
