# Qerin — Backend Service

> **Superseded:** the Express example below predates the actual build.
> `apps/backend` is a Hono app (`src/index.ts`) on Cloudflare Workers with
> three routes sharing one handler (`src/answerHandler.ts`): free
> `POST /v1/answer` (gated by an internal shared secret, called only by
> the frontend), paid `POST /v1/paid/answer` (x402 paywall via
> `@x402/hono` — the real subject of this doc is now split across that
> route and `03-payment-layer.md`), and `POST /v1/keys` (optional
> developer identity, not billing). See `07-deployment.md` for the
> current deploy path.

This is the single API endpoint the frontend (and, later, third-party 
developers) call. It ties together source selection, payment, retrieval, 
and answer synthesis into one request/response cycle.

## The endpoint

```typescript
// server.ts
import express from "express";
import { selectSources } from "./selectSources";
import { gatherSources } from "./orchestrator";
import { synthesizeAnswer } from "./synthesize";

const app = express();
app.use(express.json());

app.post("/v1/answer", async (req, res) => {
  const { question } = req.body;

  if (!question || typeof question !== "string") {
    return res.status(400).json({ error: "question is required" });
  }

  try {
    const sourceKeys = selectSources(question);
    const paidResults = await gatherSources(question, sourceKeys);

    if (paidResults.length === 0) {
      return res.status(502).json({
        error: "No sources responded",
        message:
          "Qerin could not reach any paid source. No charge was made.",
      });
    }

    const answer = await synthesizeAnswer(question, paidResults);

    const receipt = paidResults.map((r) => ({
      source: r.sourceName,
      amountPaid: r.amountPaid,
      txHash: r.txHash,
      basescanUrl: r.txHash
        ? `https://sepolia.basescan.org/tx/${r.txHash}`
        : null,
      timestamp: r.timestamp,
    }));

    const totalPaid = paidResults
      .reduce((sum, r) => sum + parseFloat(r.amountPaid || "0"), 0)
      .toFixed(3);

    return res.json({
      question,
      answer,
      receipt,
      totalPaid,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
});

app.listen(process.env.PORT || 3001);
```

## Answer synthesis

```typescript
// synthesize.ts
import Anthropic from "@anthropic-ai/sdk";
import type { PaidResult } from "./paidFetch";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function synthesizeAnswer(
  question: string,
  sources: PaidResult[]
): Promise<string> {
  const sourceText = sources
    .map((s) => `Source: ${s.sourceName}\n${JSON.stringify(s.content)}`)
    .join("\n\n");

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `Question: ${question}\n\nPaid source content:\n${sourceText}\n\nWrite a short, direct answer (3-4 sentences) based only on the source content above. Do not speculate beyond what the sources say.`,
      },
    ],
  });

  const block = message.content[0];
  return block.type === "text" ? block.text : "";
}
```

## Response shape (what the frontend receives)

```json
{
  "question": "What happened in the CryptoSlate hack this week?",
  "answer": "Recent coverage confirms the story is still developing...",
  "receipt": [
    {
      "source": "CryptoSlate",
      "amountPaid": "0.02",
      "txHash": "0x8f2a1c...c91d",
      "basescanUrl": "https://sepolia.basescan.org/tx/0x8f2a1c...c91d",
      "timestamp": "2026-08-01T13:04:22.000Z"
    },
    {
      "source": "Superhighway",
      "amountPaid": "0.001",
      "txHash": "0x3b6e77...7a12",
      "basescanUrl": "https://sepolia.basescan.org/tx/0x3b6e77...7a12",
      "timestamp": "2026-08-01T13:04:24.000Z"
    }
  ],
  "totalPaid": "0.021"
}
```

This shape maps directly onto the Receipt Strip component already 
designed (Asset 3) — `receipt[].source` is the source name row, 
`receipt[].amountPaid` is the right-aligned mono amount, 
`receipt[].basescanUrl` is the "View on Basescan" link target, and 
`totalPaid` is the header total.

## The B2B endpoint (Developer/API screen, Asset 8)

Same endpoint, same response shape — the Developer screen's code sample 
(`POST /v1/answer`) is not a different API, it's the same one shown to 
a different audience. The only addition for real B2B usage would be:

- API key authentication (`Authorization: Bearer <key>`) instead of 
  open access
- Usage metering per API key, to generate the "$0.15 per verified 
  answer" invoice line shown on the Developer screen
- Rate limiting per key

These are listed here for completeness but are not required for a 
Demo Day prototype — an open, unauthenticated endpoint is fine to 
demonstrate the mechanism live.
