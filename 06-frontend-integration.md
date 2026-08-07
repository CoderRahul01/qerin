# Qerin — Frontend Integration

This connects the Claude Design HTML/React output to the real backend 
described in `04-backend-service.md`. The design work is done — this 
is only about wiring it to live data instead of the placeholder values 
currently baked into the prototype.

## What changes, what doesn't

**Does not change:** every visual element, color, font, spacing 
decision already locked in the design prompts. This document is purely 
about data wiring, not restyling.

**Does change:** replace hardcoded placeholder text (the sample 
question, the sample answer, the sample receipt line items and amounts) 
with real values coming from `/v1/answer`.

## Minimal integration

If the Claude Design export is plain HTML/CSS/JS, wrap the relevant DOM 
updates in a single fetch call triggered when the person submits a 
question on the Ask screen:

```javascript
// qerin-client.js
async function askQerin(question) {
  showPayingScreen(); // existing screen transition, already built

  const response = await fetch("https://your-backend-url/v1/answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    showError("Qerin couldn't reach a paid source. Try again.");
    return;
  }

  const data = await response.json();
  renderAnswerScreen(data);
}

function renderAnswerScreen(data) {
  document.querySelector(".qerin-question-text").textContent = data.question;
  document.querySelector(".qerin-answer-text").textContent = data.answer;
  document.querySelector(".qerin-total-paid").textContent = `$${data.totalPaid}`;

  const receiptList = document.querySelector(".qerin-receipt-list");
  receiptList.innerHTML = "";

  data.receipt.forEach((item) => {
    const row = document.createElement("div");
    row.className = "qerin-receipt-row";
    row.innerHTML = `
      <div class="qerin-receipt-source">${item.source}</div>
      <div class="qerin-receipt-amount">$${item.amountPaid}</div>
      <a class="qerin-receipt-link" href="${item.basescanUrl}" target="_blank">
        View on Basescan
      </a>
    `;
    receiptList.appendChild(row);
  });

  showAnswerScreen(); // existing screen transition, already built
}
```

The exact selectors (`.qerin-question-text`, etc.) will depend on the 
actual class names Claude Design generated — inspect the exported HTML 
and adjust selectors to match, but the pattern (fetch, then populate 
existing DOM nodes) stays the same regardless of the generated markup.

## If the export is React/Next.js instead of plain HTML

Same pattern, as a hook:

```typescript
// useQerinAnswer.ts
import { useState } from "react";

interface ReceiptItem {
  source: string;
  amountPaid: string;
  basescanUrl: string | null;
}

interface AnswerData {
  question: string;
  answer: string;
  receipt: ReceiptItem[];
  totalPaid: string;
}

export function useQerinAnswer() {
  const [data, setData] = useState<AnswerData | null>(null);
  const [status, setStatus] = useState<"idle" | "paying" | "done" | "error">("idle");

  async function ask(question: string) {
    setStatus("paying");
    try {
      const res = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) throw new Error("request failed");
      const json = await res.json();
      setData(json);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return { ask, data, status };
}
```

Note the frontend calls `/api/answer`, a Next.js API route that proxies 
to the real backend — this keeps the backend URL and any future API 
keys out of client-side code:

```typescript
// app/api/answer/route.ts
export async function POST(req: Request) {
  const body = await req.json();
  const res = await fetch(`${process.env.QERIN_BACKEND_URL}/v1/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
```

## The Paying screen's sequential animation

The existing Paying screen design shows sources flipping from 
"waiting" to "paying" to "paid" in sequence. The real backend, as 
written in `04-backend-service.md`, pays all sources in parallel via 
`Promise.allSettled` and returns once everything is done — it does not 
naturally stream per-source progress.

Two honest options:

1. **Simplify for the demo:** keep the Paying screen's animation as a 
   fixed, pre-timed sequence (as already designed) that plays while the 
   real request is in flight in the background, then transition to the 
   Answer screen once the real response arrives — whichever takes 
   longer, animation or real response, gates the transition. This is 
   honest because the payments genuinely are happening during that 
   window, even if the on-screen sequencing isn't literally reporting 
   live per-call status.

2. **Build real streaming status** using Server-Sent Events or a 
   WebSocket from the backend, emitting a small event each time one 
   source's payment settles. This is more work and not necessary for a 
   Demo Day prototype — flag it as a "next step" in the pitch rather 
   than building it now.

Recommendation: option 1 for the demo, mention option 2 as roadmap.
