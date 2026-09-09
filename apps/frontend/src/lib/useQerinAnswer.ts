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
      const message = err instanceof Error ? err.message : "Qerin couldn't reach a paid source. Try again.";
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
