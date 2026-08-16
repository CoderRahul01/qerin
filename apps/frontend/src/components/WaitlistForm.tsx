"use client";

import { useState } from "react";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "loading") return;

    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data?.error ?? "Something went wrong.");
        return;
      }
      setStatus("done");
      setMessage(
        data.joined
          ? "You're on the list — we'll email you when Qerin opens up."
          : "You're already on the list."
      );
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Try again.");
    }
  };

  if (status === "done") {
    return (
      <div style={{ fontSize: 15, fontWeight: 500, color: "#12141A" }}>{message}</div>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 420 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={{
            flex: "1 1 220px",
            height: 48,
            padding: "0 16px",
            borderRadius: 9999,
            border: "1px solid #D8D5CC",
            background: "#FFFFFF",
            fontSize: 15,
            fontFamily: "var(--font-ibm-plex-sans), var(--font-inter), sans-serif",
            color: "#12141A",
          }}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          style={{
            height: 48,
            padding: "0 24px",
            borderRadius: 9999,
            border: "none",
            background: "#12141A",
            color: "#FFFFFF",
            fontWeight: 600,
            fontSize: 15,
            cursor: status === "loading" ? "default" : "pointer",
            opacity: status === "loading" ? 0.7 : 1,
            fontFamily: "var(--font-ibm-plex-sans), var(--font-inter), sans-serif",
          }}
        >
          {status === "loading" ? "Joining…" : "Join waitlist"}
        </button>
      </div>
      {status === "error" && (
        <div style={{ fontSize: 13, color: "#B3261E" }}>{message}</div>
      )}
    </form>
  );
}
