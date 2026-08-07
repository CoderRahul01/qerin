# Qerin — Verification Against Official Docs (Corrections)

Checked the technical docs (01–08) against docs.base.org/llms.txt and 
the linked pages it points to for x402 (docs.cdp.coinbase.com/x402). 
Here is what was confirmed correct, and what needs to change.

---

## ✅ Confirmed correct

- **Base Sepolia deploy pattern** (`05-smart-contract.md`): 
  `forge create <path>:<contract> --rpc-url $BASE_SEPOLIA_RPC_URL 
  --account deployer --broadcast` matches Base's own deploy quickstart 
  exactly, apart from one missing flag (see corrections below).
- **RPC URLs**: `https://sepolia.base.org` (testnet) and 
  `https://mainnet.base.org` are the exact URLs Base's own docs use.
- **x402 is real, chain-agnostic, Base-primary**: confirmed via CDP's 
  own docs — "AI agents that autonomously pay for API access" is 
  explicitly listed as a named x402 use case, no per-request human 
  approval required at the protocol level. This confirms the core 
  premise of Qerin is sound and matches how x402 is meant to be used.
- **Package existence**: `@x402/fetch`, `@x402/evm`, `@x402/axios`, 
  `@x402/core`, `@x402/extensions` are all real, currently documented 
  packages.
- **viem for wallet signing** (`privateKeyToAccount`) is the correct, 
  currently-documented pattern for a standalone EVM wallet client.

## ⚠️ Needs correction — payment layer code

**The `@x402/fetch` usage in `03-payment-layer.md` and `05-smart-contract.md` 
does not match the current API shape.** The old code passed the account 
directly into `wrapFetchWithPayment`. The current, correct pattern per 
CDP's live Quickstart for Buyers is:

```typescript
// CORRECTED wallet.ts + paidFetch.ts
import { x402Client, wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

// 1. Create the signer
const signer = privateKeyToAccount(
  process.env.QERIN_WALLET_PRIVATE_KEY as `0x${string}`
);

// 2. Create an x402Client and register the payment scheme
const client = new x402Client();
registerExactEvmScheme(client, { signer });

// 3. Wrap fetch with the CLIENT (not the raw signer)
export const fetchWithPayment = wrapFetchWithPayment(fetch, client);

export async function paySource(sourceName: string, url: string) {
  const response = await fetchWithPayment(url, { method: "GET" });
  const body = await response.json();

  let paymentResponse = null;
  if (response.ok) {
    const httpClient = new x402HTTPClient(client);
    paymentResponse = httpClient.getPaymentSettleResponse((name) =>
      response.headers.get(name)
    );
  }

  return {
    content: body,
    sourceName,
    amountPaid: paymentResponse?.amount ?? "unknown",
    txHash: paymentResponse?.transactionHash ?? null,
    timestamp: new Date().toISOString(),
  };
}
```

Key differences from the original doc:
- `wrapFetchWithPayment` takes an `x402Client` instance, not a raw 
  signer/account
- Payment schemes must be explicitly registered via 
  `registerExactEvmScheme(client, { signer })` before use
- Reading the settlement receipt uses `x402HTTPClient` + 
  `getPaymentSettleResponse`, not a standalone `decodeXPaymentResponse` 
  function as originally written
- The import for `wrapFetchWithPayment` is `@x402/fetch`, and 
  `registerExactEvmScheme` comes from `@x402/evm/exact/client` 
  specifically, not the top-level `@x402/evm`

## ⚠️ Needs correction — facilitator choice

The original `07-deployment.md` named `https://x402.org/facilitator` as 
the primary facilitator. Per CDP's current docs, this is accurate as an 
option but is explicitly the **secondary, no-signup fallback** — CDP's 
own facilitator is now the recommended default for both testnet and 
mainnet:

| Environment | Facilitator URL | Networks | Auth |
|---|---|---|---|
| **CDP (recommended)** | `https://api.cdp.coinbase.com/platform/v2/x402` | Base, Base Sepolia, Polygon, Arbitrum, World, World Sepolia, Solana, Solana Devnet | CDP API keys required |
| x402.org (testnet only) | `https://x402.org/facilitator` | Base Sepolia, Solana Devnet | None |

Recommendation: use `x402.org/facilitator` for the very first local 
test (zero setup, confirms the mechanism works), then switch to the 
CDP facilitator before the actual Demo Day build, since it also covers 
mainnet if this ever moves past testnet, and gives 1,000 free 
transactions/month.

## ⚠️ Needs correction — wallet creation recommendation

CDP's docs list **CDP Server Wallet** as the *recommended* way to 
create Qerin's wallet, not a standalone viem private key as originally 
written. Both work; the original `02-stack-decision.md` and 
`03-payment-layer.md` should note this tradeoff explicitly:

- **Standalone viem private key** (what the original docs used): 
  simplest to understand and demo, but the raw private key needs 
  manual secure handling as described in `08-security-and-limits.md`.
- **CDP Server Wallet** (`@coinbase/cdp-sdk`): Coinbase manages key 
  custody server-side, requires a CDP account and API keys 
  (`CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, `CDP_WALLET_SECRET`), and is 
  what Coinbase itself recommends for production-shaped services.

For a Demo Day prototype specifically, the standalone viem key remains 
the faster path to a working demo with fewer external account 
dependencies — this is a legitimate deviation from Coinbase's 
"recommended" default, not an error, but it should be stated as a 
deliberate choice rather than left silent.

## ⚠️ Needs correction — Base MCP is a different, non-applicable path

Base's own `docs.base.org/agents/guides/x402-payments` page describes a 
**different x402 flow** than what Qerin needs: Base MCP's version 
requires a human to open an approval link and sign each payment 
individually, which is explicitly designed for an AI assistant asking a 
human to approve a purchase — not for autonomous, no-human-in-the-loop 
micropayments at the volume Qerin needs (multiple sources, every 
question, no approval friction).

Base's own docs point away from this path for Qerin's use case: the 
x402-payments guide itself says "for additional x402 solutions, 
including guidance on building an x402 endpoint, see the CDP x402 
docs" — confirming the CDP path (what `03-payment-layer.md` uses, now 
corrected above) is the right one, not Base MCP.

## ⚠️ Minor correction — missing `--broadcast` flag

`05-smart-contract.md`'s deploy command was missing the `--broadcast` 
flag, without which Foundry only performs a dry run and does not 
actually deploy. Corrected command:

```bash
forge create ./src/QerinReceiptRegistry.sol:QerinReceiptRegistry \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --account deployer \
  --broadcast \
  --constructor-args <qerin-backend-wallet-address>
```

## What this means overall

The architecture and stack decisions in `01-architecture-overview.md` 
and `02-stack-decision.md` hold up: Base Sepolia, x402's TypeScript 
SDK, a backend-held wallet, Next.js frontend — all correct and current. 
The corrections are isolated to specific code snippets in 
`03-payment-layer.md` and the facilitator URL in `07-deployment.md`, 
both now given corrected versions above. Apply these corrections before 
writing any real code from the original docs.
