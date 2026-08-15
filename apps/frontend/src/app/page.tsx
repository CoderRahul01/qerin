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
    body: "An agent picks the right paid research platforms and pays each one in USDC on Base, live.",
  },
  {
    title: "Get a verified answer",
    body: "A synthesized answer with every source, price, and on-chain receipt — nothing hidden.",
  },
];

export default function Home() {
  return (
    <div style={{ background: "#F7F5F0", minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <header style={{ width: "100%", maxWidth: 960, margin: "0 auto", padding: "20px 24px", flexShrink: 0 }}>
        <LogoRow padding="0" />
      </header>

      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: "100%",
          maxWidth: 960,
          margin: "0 auto",
          padding: "8px 24px",
        }}
      >
        <section
          className="qerin-fade-up"
          style={{ padding: "clamp(12px, 3vw, 28px) 0 clamp(16px, 3vw, 28px)", animationDelay: "0ms" }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(30px, 5.5vw, 52px)",
              lineHeight: 1.08,
              fontWeight: 700,
              color: "#12141A",
              maxWidth: 720,
              letterSpacing: "-0.01em",
            }}
          >
            Ask anything. Qerin pays for the truth.
          </h1>
          <p
            style={{
              marginTop: 16,
              fontSize: "clamp(15px, 1.9vw, 18px)",
              lineHeight: 1.5,
              color: "#6B6E76",
              maxWidth: 560,
            }}
          >
            Every Qerin answer is backed by paid, verified research sources — not a guess from a
            language model. Qerin's own wallet pays each source in USDC on Base, with a public
            receipt for every payment.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
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
                transition: "opacity 0.15s ease",
              }}
            >
              Try Qerin
            </Link>
          </div>
        </section>

        <section
          className="qerin-fade-up"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 20,
            padding: "clamp(16px, 3vw, 28px) 0",
            borderTop: "1px solid #D8D5CC",
            animationDelay: "90ms",
          }}
        >
          {steps.map((step, i) => (
            <div key={step.title}>
              <div
                style={{
                  fontFamily: "var(--font-ibm-plex-mono), monospace",
                  fontSize: 12,
                  color: "#0000FF",
                  fontWeight: 700,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </div>
              <div style={{ marginTop: 6, fontSize: 16, fontWeight: 600, color: "#12141A" }}>
                {step.title}
              </div>
              <div style={{ marginTop: 4, fontSize: 13.5, lineHeight: 1.5, color: "#6B6E76" }}>
                {step.body}
              </div>
            </div>
          ))}
        </section>

        <div className="qerin-glow-border qerin-fade-up" style={{ marginTop: "clamp(12px, 3vw, 24px)", animationDelay: "170ms" }}>
          <section
            id="waitlist"
            style={{
              padding: "clamp(18px, 3.5vw, 32px)",
              borderRadius: 16,
              background: "#FFFFFF",
            }}
          >
            <div style={{ fontSize: "clamp(19px, 2.6vw, 24px)", fontWeight: 700, color: "#12141A" }}>
              Join the waitlist
            </div>
            <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.5, color: "#6B6E76", maxWidth: 520 }}>
              Waitlist members get early access and a discounted rate — $0.85 instead of $1.15 —
              when Qerin opens up. We'll email you the moment it's ready.
            </p>
            <div style={{ marginTop: 16 }}>
              <WaitlistForm />
            </div>
          </section>
        </div>
      </main>

      <footer
        style={{
          width: "100%",
          maxWidth: 960,
          margin: "0 auto",
          padding: "16px 24px 20px",
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 13, color: "#6B6E76" }}>
          Building on top of Qerin?{" "}
          <Link href="/app" style={{ color: "#0000FF" }}>
            Open the app for developer API pricing →
          </Link>
        </div>
      </footer>
    </div>
  );
}
