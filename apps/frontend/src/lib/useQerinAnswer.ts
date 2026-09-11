import { useState } from "react";
import type { AnswerData, AnswerProgressEvent } from "./types";

export type AskStatus = "idle" | "paying" | "done" | "error" | "insufficient_balance";

export type AskResult =
  | { ok: true; data: AnswerData }
  | { ok: false; reason: "insufficient_balance"; required: number | null }
  | { ok: false; reason: "error"; message: string };

// Parses one Server-Sent Events frame (the part before a blank line) into
// its event name + joined data lines, per the SSE wire format written by
// hono/streaming's streamSSE on the backend.
function parseSseFrame(frame: string): { event: string; data: string } | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
  }
  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join("\n") };
}

export function useQerinAnswer() {
  const [data, setData] = useState<AnswerData | null>(null);
  const [status, setStatus] = useState<AskStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function ask(
    question: string,
    accountId: string,
    network?: string,
    onProgress?: (event: AnswerProgressEvent) => void
  ): Promise<AskResult> {
    setStatus("paying");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Qerin-Account-Id": accountId },
        body: JSON.stringify({ question, network }),
        // Slightly longer than /api/answer's own 110s backend timeout, so
        // that route's controlled error response is what the user sees —
        // this is only a last-resort net in case the proxy itself never
        // returns at all.
        signal: AbortSignal.timeout(115_000),
      });

      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("text/event-stream") && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let sepIdx: number;
          while ((sepIdx = buffer.indexOf("\n\n")) !== -1) {
            const frame = buffer.slice(0, sepIdx);
            buffer = buffer.slice(sepIdx + 2);
            const parsed = parseSseFrame(frame);
            if (!parsed) continue;

            if (parsed.event === "progress") {
              try {
                onProgress?.(JSON.parse(parsed.data) as AnswerProgressEvent);
              } catch {}
            } else if (parsed.event === "done") {
              const json = JSON.parse(parsed.data) as AnswerData;
              setData(json);
              setStatus("done");
              return { ok: true, data: json };
            } else if (parsed.event === "error") {
              let message = "Request failed";
              try {
                const json = JSON.parse(parsed.data);
                message = json?.message || json?.error || message;
              } catch {}
              throw new Error(message);
            }
          }
        }
        // Stream closed without a terminal done/error event — treat as a
        // failure rather than silently resolving with nothing.
        throw new Error("Connection closed before Qerin finished responding. Try again.");
      }

      // Not a stream — one of the early-exit plain JSON responses (bad
      // request, insufficient balance, internal error before any work
      // started).
      const json = await res.json();
      if (!res.ok) {
        if (json?.error === "insufficient_balance") {
          setStatus("insufficient_balance");
          const required = typeof json.required === "number" ? json.required : null;
          return { ok: false, reason: "insufficient_balance", required };
        }
        throw new Error(json?.message || json?.error || "Request failed");
      }
      setData(json);
      setStatus("done");
      return { ok: true, data: json as AnswerData };
    } catch (err) {
      const timedOut = err instanceof Error && err.name === "TimeoutError";
      const message = timedOut
        ? "Qerin took too long to respond. No charge was made — try again."
        : err instanceof Error
          ? err.message
          : "Qerin couldn't reach a paid source. Try again.";
      setStatus("error");
      setErrorMessage(message);
      return { ok: false, reason: "error", message };
    }
  }

  function reset() {
    setData(null);
    setStatus("idle");
    setErrorMessage(null);
  }

  return { ask, reset, data, status, errorMessage };
}
