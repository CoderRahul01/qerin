import { LogoRow } from "@/components/StatusBar";
import { WaitlistForm } from "@/components/WaitlistForm";
import { StepsFlow } from "@/components/StepsFlow";
import { SocialUpdates } from "@/components/SocialUpdates";

export default function Home() {
  return (
    <div style={{ background: "#F7F5F0", minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <header style={{ width: "100%", maxWidth: 960, margin: "0 auto", padding: "20px 24px", flexShrink: 0 }}>
        <LogoRow padding="0" />
      </header>

      <main
        style={{
          width: "100%",
          maxWidth: 960,
          margin: "0 auto",
          padding: "0 24px 32px",
        }}
      >
        <section
          className="qerin-fade-up"
          style={{ padding: "clamp(4px, 1.5vw, 12px) 0 clamp(12px, 2.5vw, 20px)", animationDelay: "0ms" }}
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
          <div style={{ marginTop: 20 }}>
            <a
              href="#waitlist"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 15,
                fontWeight: 600,
                color: "#0000FF",
                textDecoration: "none",
              }}
            >
              Join the waitlist ↓
            </a>
          </div>
        </section>

        <section
          className="qerin-fade-up"
          style={{ padding: "clamp(16px, 3vw, 24px) 0", borderTop: "1px solid #D8D5CC", animationDelay: "90ms" }}
        >
          <StepsFlow />
        </section>

        <SocialUpdates />

        <div className="qerin-glow-border qerin-fade-up" style={{ marginTop: "clamp(8px, 2vw, 16px)", animationDelay: "260ms" }}>
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
              when Qerin opens up. We'll email you the moment it's ready. Developers get API
              access through the same waitlist.
            </p>
            <div style={{ marginTop: 16 }}>
              <WaitlistForm />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
