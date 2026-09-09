import { useState } from "react";
import type { AnswerData } from "./types";

export type AskStatus = "idle" | "paying" | "done" | "error" | "insufficient_balance";

export type AskResult =
  | { ok: true; data: AnswerData }
  | { ok: false; reason: "insufficient_balance"; required: number | null }
  | { ok: false; reason: "error"; message: string };

export function useQerinAnswer() {
  const [data, setData] = useState<AnswerData | null>(null);
  const [status, setStatus] = useState<AskStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function ask(question: string, accountId: string, network?: string): Promise<AskResult> {
    setStatus("paying");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Qerin-Account-Id": accountId },
        body: JSON.stringify({ question, network }),
        // Slightly longer than /api/answer's own 45s backend timeout, so
        // that route's controlled error response is what the user sees —
        // this is only a last-resort net in case the proxy itself never
        // returns at all.
        signal: AbortSignal.timeout(50_000),
      });
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
