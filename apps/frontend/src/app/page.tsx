import Link from "next/link";
import { LogoRow } from "@/components/StatusBar";
import { WaitlistForm } from "@/components/WaitlistForm";

const steps = [
  {
    title: "Ask a question",
    body: "Anything about crypto, markets, or research — Qerin never answers from memory.",
  },
  {
    title: "Qerin pays for sources",
    body: "An agent picks the right paid research platforms for your question and pays each one in USDC on Base, live.",
  },
  {
    title: "Get a verified answer",
    body: "A synthesized answer with every source, price, and on-chain receipt attached — nothing hidden, nothing invented.",
  },
];

export default function Home() {
  return (
    <div style={{ background: "#F7F5F0", minHeight: "100dvh" }}>
      <header style={{ maxWidth: 960, margin: "0 auto", padding: "20px 24px" }}>
        <LogoRow padding="0" />
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px 96px" }}>
        <section style={{ padding: "clamp(32px, 8vw, 96px) 0 clamp(24px, 5vw, 48px)" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(32px, 6vw, 56px)",
              lineHeight: 1.08,
              fontWeight: 700,
              color: "#12141A",
              maxWidth: 720,
            }}
          >
            Ask anything. Qerin pays for the truth.
          </h1>
          <p
            style={{
              marginTop: 20,
              fontSize: "clamp(16px, 2.2vw, 19px)",
              lineHeight: 1.5,
              color: "#6B6E76",
              maxWidth: 560,
            }}
          >
            Every Qerin answer is backed by paid, verified research sources — not a guess from a
            language model. Qerin's own wallet pays each source in USDC on Base, and every payment
            gets a public receipt.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
            <Link
              href="/app"
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 48,
                padding: "0 24px",
                borderRadius: 8,
                background: "#0000FF",
                color: "#FFFFFF",
                fontWeight: 600,
                fontSize: 15,
                textDecoration: "none",
              }}
            >
              Try Qerin
            </Link>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 24,
            padding: "clamp(24px, 5vw, 48px) 0",
            borderTop: "1px solid #D8D5CC",
          }}
        >
          {steps.map((step, i) => (
            <div key={step.title}>
              <div
                style={{
                  fontFamily: "var(--font-ibm-plex-mono), monospace",
                  fontSize: 13,
                  color: "#0000FF",
                  fontWeight: 700,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </div>
              <div style={{ marginTop: 8, fontSize: 17, fontWeight: 600, color: "#12141A" }}>
                {step.title}
              </div>
              <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.55, color: "#6B6E76" }}>
                {step.body}
              </div>
            </div>
          ))}
        </section>

        <section
          id="waitlist"
          style={{
            marginTop: "clamp(24px, 5vw, 48px)",
            padding: "clamp(24px, 5vw, 40px)",
            borderRadius: 16,
            border: "1px solid #D8D5CC",
            background: "#FFFFFF",
          }}
        >
          <div style={{ fontSize: "clamp(20px, 3vw, 26px)", fontWeight: 700, color: "#12141A" }}>
            Join the waitlist
          </div>
          <p style={{ marginTop: 10, fontSize: 15, lineHeight: 1.55, color: "#6B6E76", maxWidth: 520 }}>
            Waitlist members get early access and a discounted rate on verified answers — $0.85
            instead of $1.15 — when Qerin opens up. We'll email you the moment it's ready.
          </p>
          <div style={{ marginTop: 20 }}>
            <WaitlistForm />
          </div>
        </section>

        <section style={{ marginTop: "clamp(24px, 5vw, 48px)" }}>
          <div style={{ fontSize: 14, color: "#6B6E76" }}>
            Building on top of Qerin?{" "}
            <Link href="/app" style={{ color: "#0000FF" }}>
              Open the app for developer API pricing →
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
