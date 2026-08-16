import { LogoRow } from "@/components/StatusBar";
import { WaitlistForm } from "@/components/WaitlistForm";
import { StepsFlow, type FlowStep } from "@/components/StepsFlow";
import { SocialUpdates } from "@/components/SocialUpdates";

const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS;

const howItWorks: FlowStep[] = [
  {
    title: "Your platform sends a query",
    body: "One call through Qerin's API — no wallet, no x402 client, no crypto integration on your end.",
    icon: (
      <path
        d="M9 8L5 12L9 16M15 8L19 12L15 16"
        stroke="#0000FF"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: "Qerin pays the source",
    body: "Directly, in USDC, on Base — the paywalled publisher gets paid in real time, not scraped.",
    icon: (
      <>
        <circle cx="12" cy="12" r="7" stroke="#0000FF" strokeWidth="1.8" fill="none" />
        <path
          d="M9.6 14.3c.4.7 1.2 1.1 2.1 1.1 1.3 0 2.3-.7 2.3-1.7 0-1-1-1.4-2.3-1.7-1.3-.3-2.3-.7-2.3-1.7 0-1 1-1.7 2.3-1.7.9 0 1.7.4 2.1 1.1"
          stroke="#0000FF"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
        <path d="M12 7.6v1M12 15.4v1" stroke="#0000FF" strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
  },
  {
    title: "Content is retrieved & synthesized",
    body: "The real, paid content behind the paywall becomes a short, verified answer.",
    icon: (
      <>
        <path
          d="M7 4.5h7l3 3v12a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-14a.5.5 0 0 1 .5-.5Z"
          stroke="#0000FF"
          strokeWidth="1.5"
          fill="none"
          strokeLinejoin="round"
        />
        <path d="M9.5 12h5M9.5 15h5M9.5 9h2.5" stroke="#0000FF" strokeWidth="1.3" strokeLinecap="round" />
      </>
    ),
  },
  {
    title: "An on-chain receipt is generated",
    body: "Verifiable, itemized, tied to the transaction — checkable on Basescan, not just claimed.",
    icon: (
      <>
        <path
          d="M6 4a1 1 0 0 1 1-1h6l6 6v10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4Z"
          stroke="#0000FF"
          strokeWidth="1.4"
          fill="none"
          strokeLinejoin="round"
        />
        <path d="M9 13l2.2 2.2L16 10" stroke="#0000FF" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
];

function Eyebrow({ children }: { children: string }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-ibm-plex-mono), monospace",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.06em",
        color: "#0000FF",
      }}
    >
      {children}
    </div>
  );
}

function PillLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 48,
        padding: "0 24px",
        borderRadius: 9999,
        background: "#12141A",
        color: "#FFFFFF",
        fontWeight: 600,
        fontSize: 15,
        textDecoration: "none",
      }}
    >
      {children}
    </a>
  );
}

export default function Home() {
  return (
    <div
      style={{
        background: "#FFFFFF",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-ibm-plex-sans), var(--font-inter), sans-serif",
      }}
    >
      <header style={{ width: "100%", maxWidth: 880, margin: "0 auto", padding: "20px 24px", flexShrink: 0 }}>
        <LogoRow padding="0" />
      </header>

      <main style={{ width: "100%", maxWidth: 880, margin: "0 auto", padding: "0 24px 40px" }}>
        {/* Hero */}
        <section className="qerin-fade-up" style={{ padding: "clamp(4px, 1.5vw, 12px) 0 clamp(16px, 3vw, 24px)", animationDelay: "0ms" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(30px, 5.5vw, 50px)",
              lineHeight: 1.1,
              fontWeight: 700,
              color: "#12141A",
              maxWidth: 640,
              letterSpacing: "-0.01em",
            }}
          >
            Truth isn&apos;t free. Now you know what it costs.
          </h1>
          <p style={{ marginTop: 16, fontSize: "clamp(15px, 1.9vw, 18px)", lineHeight: 1.55, color: "#565656", maxWidth: 560 }}>
            Qerin is an AI agent that pays real micropayments to paywalled sources, retrieves verified
            content, and hands you an on-chain receipt for every answer.
          </p>
          <div style={{ marginTop: 24 }}>
            <PillLink href="#waitlist">Get API access</PillLink>
          </div>
        </section>

        {/* Problem */}
        <section className="qerin-fade-up" style={{ padding: "clamp(16px, 3vw, 24px) 0", borderTop: "1px solid #D8D5CC", animationDelay: "80ms" }}>
          <Eyebrow>THE PROBLEM</Eyebrow>
          <div style={{ marginTop: 8, fontSize: "clamp(20px, 2.8vw, 26px)", fontWeight: 700, color: "#12141A" }}>
            AI can&apos;t pay for what it reads
          </div>
          <p style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55, color: "#565656", maxWidth: 620 }}>
            Paywalled publishers and data sources block AI agents or require a human to approve every
            payment. There&apos;s no record of what was actually paid for, or to whom.
          </p>
        </section>

        {/* Solution */}
        <section className="qerin-fade-up" style={{ padding: "clamp(16px, 3vw, 24px) 0", borderTop: "1px solid #D8D5CC", animationDelay: "140ms" }}>
          <Eyebrow>THE SOLUTION</Eyebrow>
          <div style={{ marginTop: 8, fontSize: "clamp(20px, 2.8vw, 26px)", fontWeight: 700, color: "#12141A" }}>
            An agent that pays, verifies, and proves it
          </div>
          <p style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55, color: "#565656", maxWidth: 620 }}>
            Qerin pays x402 micropayments in USDC on Base, retrieves the real content behind the paywall,
            and returns a short synthesized answer. Every transaction is logged on-chain — an itemized
            receipt showing exactly what was paid and to whom.
          </p>
        </section>

        {/* How it works */}
        <section className="qerin-fade-up" style={{ padding: "clamp(16px, 3vw, 24px) 0", borderTop: "1px solid #D8D5CC", animationDelay: "200ms" }}>
          <Eyebrow>HOW IT WORKS</Eyebrow>
          <div style={{ marginTop: 16 }}>
            <StepsFlow steps={howItWorks} label="How Qerin works" />
          </div>
        </section>

        {/* For builders */}
        <section className="qerin-fade-up" style={{ padding: "clamp(16px, 3vw, 24px) 0", borderTop: "1px solid #D8D5CC", animationDelay: "260ms" }}>
          <Eyebrow>FOR BUILDERS</Eyebrow>
          <div style={{ marginTop: 8, fontSize: "clamp(20px, 2.8vw, 26px)", fontWeight: 700, color: "#12141A" }}>
            Pay only for delivered answers
          </div>
          <p style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55, color: "#565656", maxWidth: 620 }}>
            Qerin is B2B infrastructure. Embed the API and pay per successfully delivered, verified
            answer — outcome-based pricing, not seat licenses or flat fees.
          </p>
        </section>

        {/* Proof */}
        <section className="qerin-fade-up" style={{ padding: "clamp(16px, 3vw, 24px) 0", borderTop: "1px solid #D8D5CC", animationDelay: "320ms" }}>
          <Eyebrow>PROOF</Eyebrow>
          <div style={{ marginTop: 8, fontSize: "clamp(20px, 2.8vw, 26px)", fontWeight: 700, color: "#12141A" }}>
            Verified on-chain
          </div>
          <p style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55, color: "#565656", maxWidth: 620 }}>
            QerinReceiptRegistry is deployed and source-verified on Base mainnet. Every receipt is
            checkable, not just claimed.
            {REGISTRY_ADDRESS && (
              <>
                {" "}
                <a href={`https://basescan.org/address/${REGISTRY_ADDRESS}`} target="_blank" rel="noreferrer" style={{ color: "#0000FF" }}>
                  View the contract on Basescan ↗
                </a>
              </>
            )}
          </p>
        </section>

        {/* Status */}
        <section className="qerin-fade-up" style={{ padding: "clamp(16px, 3vw, 24px) 0", borderTop: "1px solid #D8D5CC", animationDelay: "380ms" }}>
          <Eyebrow>WHERE WE ARE</Eyebrow>
          <p style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55, color: "#565656", maxWidth: 620 }}>
            Qerin is pre-launch. No live users or transaction volume yet — we&apos;d rather tell you that
            directly than dress it up.
          </p>
        </section>

        <SocialUpdates />

        {/* Footer CTA / waitlist */}
        <div className="qerin-glow-border qerin-fade-up" style={{ marginTop: "clamp(8px, 2vw, 16px)", animationDelay: "440ms" }}>
          <section id="waitlist" style={{ padding: "clamp(18px, 3.5vw, 32px)", borderRadius: 16, background: "#FFFFFF" }}>
            <div style={{ fontSize: "clamp(19px, 2.6vw, 24px)", fontWeight: 700, color: "#12141A" }}>Build with Qerin</div>
            <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.5, color: "#565656", maxWidth: 520 }}>
              Join the waitlist for early API access.
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
