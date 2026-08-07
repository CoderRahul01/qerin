# Qerin — Smart Contract (Optional, Not Required for Demo)

## Do you need a custom contract at all?

No, not for the prototype. Every x402 payment already produces a real, 
independently verifiable transaction on Base — that transaction hash 
IS the receipt. Basescan already serves as the public verification 
layer. Building a custom contract to duplicate this would add 
complexity and audit surface without adding real capability at this 
stage.

Read this file only if you want the "aggregated on-chain audit trail" 
version of the B2B pitch — i.e., a contract that logs a summary record 
every time Qerin delivers an answer, so a third-party developer paying 
for the API can query Qerin's own contract (not just individual source 
transactions) to verify delivery history. This is a genuine value-add 
for the B2B story but is explicitly optional and should not block the 
Demo Day timeline.

## What this contract would do

A minimal registry contract, deployed once to Base Sepolia, that Qerin's 
backend writes to after each successfully delivered answer:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract QerinReceiptRegistry {
    struct Receipt {
        bytes32 questionHash;
        uint256 sourceCount;
        uint256 totalPaidMicroUSDC; // amount in USDC's 6 decimals
        uint256 timestamp;
    }

    mapping(bytes32 => Receipt) public receipts;
    address public immutable qerinBackend;

    event AnswerDelivered(
        bytes32 indexed receiptId,
        bytes32 questionHash,
        uint256 sourceCount,
        uint256 totalPaidMicroUSDC
    );

    error NotAuthorized();

    constructor(address _qerinBackend) {
        qerinBackend = _qerinBackend;
    }

    function recordReceipt(
        bytes32 receiptId,
        bytes32 questionHash,
        uint256 sourceCount,
        uint256 totalPaidMicroUSDC
    ) external {
        if (msg.sender != qerinBackend) revert NotAuthorized();

        receipts[receiptId] = Receipt({
            questionHash: questionHash,
            sourceCount: sourceCount,
            totalPaidMicroUSDC: totalPaidMicroUSDC,
            timestamp: block.timestamp
        });

        emit AnswerDelivered(receiptId, questionHash, sourceCount, totalPaidMicroUSDC);
    }
}
```

Design notes on why it's this simple:

- **Only the question hash is stored, not the question text.** This 
  avoids putting potentially sensitive user queries permanently on a 
  public chain. If a developer needs to prove a specific answer was 
  delivered, they can hash their own question client-side and compare.
- **Only Qerin's backend can write to it** (`onlyQerinBackend` style 
  check via `msg.sender`). This is a log, not a permissionless 
  marketplace — anyone can read it, only Qerin writes to it.
- **No token, no staking, no governance.** Adding any of that would be 
  scope creep unrelated to the actual product claim.

## Deployment (if you choose to build this)

```bash
# Using Foundry, per Base's own quickstart pattern
forge create ./src/QerinReceiptRegistry.sol:QerinReceiptRegistry \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --account deployer \
  --constructor-args <qerin-backend-wallet-address>
```

Calling it from the backend after a successful `/v1/answer` response, 
using viem, in the same style as the payment layer:

```typescript
// recordReceipt.ts
import { createWalletClient, http, keccak256, toBytes } from "viem";
import { baseSepolia } from "viem/chains";
import { qerinAccount } from "./wallet";

const client = createWalletClient({
  account: qerinAccount,
  chain: baseSepolia,
  transport: http(),
});

const REGISTRY_ADDRESS = "0xYourDeployedRegistryAddress";
const REGISTRY_ABI = [
  {
    type: "function",
    name: "recordReceipt",
    inputs: [
      { name: "receiptId", type: "bytes32" },
      { name: "questionHash", type: "bytes32" },
      { name: "sourceCount", type: "uint256" },
      { name: "totalPaidMicroUSDC", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export async function recordReceiptOnChain(
  receiptId: `0x${string}`,
  question: string,
  sourceCount: number,
  totalPaidMicroUSDC: bigint
) {
  const questionHash = keccak256(toBytes(question));

  await client.writeContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: "recordReceipt",
    args: [receiptId, questionHash, BigInt(sourceCount), totalPaidMicroUSDC],
  });
}
```

## Recommendation

Skip this for the Demo Day build. Mention it in the pitch as "roadmap" 
— it's a credible, well-scoped next step that shows you understand the 
difference between the payment proof (already real, already on x402) 
and an aggregated audit layer (a genuine but separate feature), which 
is exactly the kind of honest scoping distinction that's worked well 
for this founder's pattern in prior submissions.
