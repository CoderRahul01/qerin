import { Nav } from "@/components/Nav";
import { LogoMark } from "@/components/LogoMark";
import { WaitlistForm } from "@/components/WaitlistForm";
import { StepsFlow, type FlowStep } from "@/components/StepsFlow";
import { SocialUpdates } from "@/components/SocialUpdates";
import { HeroScene } from "@/components/HeroScene";
import { SOURCES, SourceIcon } from "@/components/SourceIcon";
import { DimensionalBadge } from "@/components/DimensionalBadge";

const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS;

const featureStrip = [
  {
    label: "x402 Micropayments",
    detail: "Built for machine-to-machine payments.",
    icon: <path d="M11 2L4 12h6l-1 8 8-11h-6l1-7Z" fill="var(--qerin-accent)" />,
  },
  {
    label: "USDC Payments",
    detail: "Every payment is made in USDC stablecoin.",
    icon: (
      <>
        <circle cx="10" cy="10" r="7.5" stroke="var(--qerin-accent)" strokeWidth="1.6" fill="none" />
        <path d="M7 12.6c.5.9 1.5 1.5 3 1.5 1.8 0 3-.9 3-2.2 0-1.3-1.4-1.8-3-2.1-1.6-.3-3-.8-3-2.1 0-1.3 1.2-2.2 3-2.2 1.5 0 2.5.6 3 1.5" stroke="var(--qerin-accent)" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </>
    ),
  },
  {
    label: "Base Blockchain",
    detail: "Secure, fast, low cost. Built to scale.",
    icon: (
      <>
        <circle cx="10" cy="10" r="7.5" stroke="var(--qerin-accent)" strokeWidth="1.6" fill="none" />
        <path d="M10 2.5a7.5 7.5 0 0 1 0 15Z" fill="var(--qerin-accent)" />
      </>
    ),
  },
  {
    label: "On-Chain Receipts",
    detail: "Transparent receipts, verifiable on Basescan.",
    icon: (
      <>
        <path d="M5 2.5h7l3 3v12a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-14a.5.5 0 0 1 .5-.5Z" stroke="var(--qerin-accent)" strokeWidth="1.4" fill="none" strokeLinejoin="round" />
        <path d="M7 10.5l2 2 4-4.5" stroke="var(--qerin-accent)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
];

const howItWorks: FlowStep[] = [
  {
    title: "Your platform sends a query",
    body: "One call through Qerin's API — no wallet, no x402 client, no crypto integration on your end.",
    icon: (
      <path
        d="M9 8L5 12L9 16M15 8L19 12L15 16"
        stroke="var(--qerin-accent)"
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
        <circle cx="12" cy="12" r="7" stroke="var(--qerin-accent)" strokeWidth="1.8" fill="none" />
        <path
          d="M9.6 14.3c.4.7 1.2 1.1 2.1 1.1 1.3 0 2.3-.7 2.3-1.7 0-1-1-1.4-2.3-1.7-1.3-.3-2.3-.7-2.3-1.7 0-1 1-1.7 2.3-1.7.9 0 1.7.4 2.1 1.1"
          stroke="var(--qerin-accent)"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
        <path d="M12 7.6v1M12 15.4v1" stroke="var(--qerin-accent)" strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
  },
  {
    title: "The real content is retrieved",
    body: "The actual content behind the paywall comes back to Qerin — not a scrape, not a cache.",
    icon: (
      <>
        <path
          d="M7 4.5h7l3 3v12a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-14a.5.5 0 0 1 .5-.5Z"
          stroke="var(--qerin-accent)"
          strokeWidth="1.5"
          fill="none"
          strokeLinejoin="round"
        />
        <path d="M9.5 12h5M9.5 15h5M9.5 9h2.5" stroke="var(--qerin-accent)" strokeWidth="1.3" strokeLinecap="round" />
      </>
    ),
  },
  {
    title: "A synthesized answer comes back",
    body: "The paid content is distilled into a short, direct answer — not a wall of links.",
    icon: (
      <>
        <path
          d="M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H10l-4 3.5v-3.5H6.5a2 2 0 0 1-2-2v-7Z"
          stroke="var(--qerin-accent)"
          strokeWidth="1.5"
          fill="none"
          strokeLinejoin="round"
        />
        <path d="M8 9.5h8M8 12.5h5" stroke="var(--qerin-accent)" strokeWidth="1.3" strokeLinecap="round" />
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
          stroke="var(--qerin-accent)"
          strokeWidth="1.4"
          fill="none"
          strokeLinejoin="round"
        />
        <path d="M9 13l2.2 2.2L16 10" stroke="var(--qerin-accent)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
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
        color: "var(--qerin-accent)",
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
        background: "var(--qerin-accent)",
        color: "var(--qerin-accent-contrast)",
        fontWeight: 600,
        fontSize: 15,
        textDecoration: "none",
      }}
    >
      {children}
    </a>
  );
}

function OutlinePillLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      className="qerin-pill-btn"
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 48,
        padding: "0 24px",
        borderRadius: 9999,
        background: "transparent",
        border: "1px solid var(--qerin-border)",
        color: "var(--qerin-text)",
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
      id="top"
      style={{
        background: "var(--qerin-bg)",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-inter), sans-serif",
      }}
    >
      <Nav />

      <main style={{ width: "100%", maxWidth: 880, margin: "0 auto", padding: "0 24px 40px" }}>
        {/* Hero */}
        <section
          className="qerin-fade-up qerin-hero-grid"
          style={{ padding: "clamp(28px, 5vw, 56px) 0 clamp(24px, 4vw, 40px)", animationDelay: "0ms" }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 28,
                padding: "0 12px",
                borderRadius: 9999,
                border: "1px solid var(--qerin-border)",
                background: "var(--qerin-bg-soft)",
                fontFamily: "var(--font-ibm-plex-mono), monospace",
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: "0.06em",
                color: "var(--qerin-text-muted)",
              }}
            >
              AI AGENTS. REAL PAYMENTS. VERIFIED SOURCES.
            </div>
            <h1
              style={{
                margin: "16px 0 0",
                fontFamily: "var(--font-space-grotesk), var(--font-inter), sans-serif",
                fontSize: "clamp(32px, 5.5vw, 52px)",
                lineHeight: 1.08,
                fontWeight: 700,
                color: "var(--qerin-text)",
                maxWidth: 520,
                letterSpacing: "-0.01em",
              }}
            >
              Verified answers,{" "}
              <span style={{ color: "var(--qerin-accent)" }}>paid in stablecoins.</span>
            </h1>
            <p style={{ marginTop: 16, fontSize: "clamp(15px, 1.9vw, 18px)", lineHeight: 1.55, color: "var(--qerin-text-muted)", maxWidth: 480 }}>
              Qerin is an AI agent that pays real x402 micropayments to paywalled sources, retrieves verified
              content, and hands you an on-chain receipt for every answer.
            </p>
            <div style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <PillLink href="#waitlist">Join waitlist</PillLink>
              <OutlinePillLink href="#how-it-works">How it works</OutlinePillLink>
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <HeroScene />
          </div>
        </section>

        {/* Trusted sources */}
        <section className="qerin-fade-up" style={{ padding: "clamp(16px, 3vw, 20px) 0", borderTop: "1px solid var(--qerin-border)", animationDelay: "60ms" }}>
          <div style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", color: "var(--qerin-text-muted)" }}>
            TRUSTED SOURCES
          </div>
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10 }}>
            {SOURCES.map((source) => (
              <div
                key={source.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  height: 34,
                  padding: "0 12px",
                  borderRadius: 9999,
                  border: "1px solid var(--qerin-border)",
                  background: "var(--qerin-surface)",
                  color: "var(--qerin-text)",
                }}
              >
                <span style={{ color: "var(--qerin-text-muted)", display: "flex" }}>
                  <SourceIcon id={source.id} size={15} />
                </span>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{source.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Problem */}
        <section className="qerin-fade-up" style={{ padding: "clamp(16px, 3vw, 24px) 0", borderTop: "1px solid var(--qerin-border)", animationDelay: "100ms" }}>
          <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
            <DimensionalBadge
              tone="neutral"
              icon={
                <>
                  <rect x="18" y="27" width="20" height="15" rx="3" />
                  <path d="M22 27v-5a6 6 0 0 1 12 0v5" />
                  <circle cx="28" cy="34" r="1.6" fill="#ffffff" stroke="none" />
                </>
              }
            />
            <div style={{ minWidth: 0 }}>
              <Eyebrow>THE PROBLEM</Eyebrow>
              <div style={{ marginTop: 8, fontSize: "clamp(20px, 2.8vw, 26px)", fontWeight: 700, color: "var(--qerin-text)" }}>
                AI can&apos;t pay for what it reads
              </div>
              <p style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55, color: "var(--qerin-text-muted)", maxWidth: 620 }}>
                Paywalled publishers and data sources block AI agents or require a human to approve every
                payment. There&apos;s no record of what was actually paid for, or to whom.
              </p>
            </div>
          </div>
        </section>

        {/* Solution */}
        <section className="qerin-fade-up" style={{ padding: "clamp(16px, 3vw, 24px) 0", borderTop: "1px solid var(--qerin-border)", animationDelay: "140ms" }}>
          <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
            <DimensionalBadge
              tone="orange"
              icon={
                <>
                  <path d="M28 14 L40 18.5 V28 C40 36 34.5 41 28 43 C21.5 41 16 36 16 28 V18.5 Z" />
                  <path d="M22 28 L26.5 32.5 L35 23" />
                </>
              }
            />
            <div style={{ minWidth: 0 }}>
              <Eyebrow>THE SOLUTION</Eyebrow>
              <div style={{ marginTop: 8, fontSize: "clamp(20px, 2.8vw, 26px)", fontWeight: 700, color: "var(--qerin-text)" }}>
                An agent that pays, verifies, and proves it
              </div>
              <p style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55, color: "var(--qerin-text-muted)", maxWidth: 620 }}>
                Qerin pays x402 micropayments in USDC on Base, retrieves the real content behind the paywall,
                and returns a short synthesized answer. Every transaction is logged on-chain — an itemized
                receipt showing exactly what was paid and to whom.
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="qerin-fade-up" style={{ padding: "clamp(16px, 3vw, 24px) 0", borderTop: "1px solid var(--qerin-border)", animationDelay: "180ms" }}>
          <Eyebrow>HOW IT WORKS</Eyebrow>
          <div style={{ marginTop: 16 }}>
            <StepsFlow steps={howItWorks} label="How Qerin works" />
          </div>
        </section>

        {/* For builders */}
        <section id="for-builders" className="qerin-fade-up" style={{ padding: "clamp(16px, 3vw, 24px) 0", borderTop: "1px solid var(--qerin-border)", animationDelay: "220ms" }}>
          <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
            <DimensionalBadge
              tone="orange"
              icon={
                <>
                  <path d="M18 18 H30 L40 28 L30 38 H18 a2 2 0 0 1 -2 -2 V20 a2 2 0 0 1 2 -2 Z" />
                  <circle cx="22.5" cy="23.5" r="1.6" fill="#ffffff" stroke="none" />
                </>
              }
            />
            <div style={{ minWidth: 0 }}>
              <Eyebrow>FOR BUILDERS</Eyebrow>
              <div style={{ marginTop: 8, fontSize: "clamp(20px, 2.8vw, 26px)", fontWeight: 700, color: "var(--qerin-text)" }}>
                Pay only for delivered answers
              </div>
              <p style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55, color: "var(--qerin-text-muted)", maxWidth: 620 }}>
                Qerin is B2B infrastructure. Embed the API and pay per successfully delivered, verified
                answer — outcome-based pricing, not seat licenses or flat fees.
              </p>
            </div>
          </div>
        </section>

        {/* Feature strip */}
        <section className="qerin-fade-up" style={{ padding: "clamp(16px, 3vw, 24px) 0", borderTop: "1px solid var(--qerin-border)", animationDelay: "260ms" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 20 }}>
            {featureStrip.map((f) => (
              <div key={f.label} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }}>
                  {f.icon}
                </svg>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--qerin-text)" }}>{f.label}</div>
                  <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.5, color: "var(--qerin-text-muted)" }}>{f.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Proof */}
        <section id="proof" className="qerin-fade-up" style={{ padding: "clamp(16px, 3vw, 24px) 0", borderTop: "1px solid var(--qerin-border)", animationDelay: "300ms" }}>
          <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
            <DimensionalBadge
              tone="success"
              pulse
              icon={
                <>
                  <circle cx="28" cy="28" r="13" />
                  <path d="M22 28 L26.5 32.5 L35 23" />
                </>
              }
            />
            <div style={{ minWidth: 0 }}>
              <Eyebrow>PROOF</Eyebrow>
              <div style={{ marginTop: 8, fontSize: "clamp(20px, 2.8vw, 26px)", fontWeight: 700, color: "var(--qerin-text)" }}>
                Verified on-chain
              </div>
              <p style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55, color: "var(--qerin-text-muted)", maxWidth: 620 }}>
                QerinReceiptRegistry is deployed and source-verified on Base mainnet. Every receipt is
                checkable, not just claimed.
                {REGISTRY_ADDRESS && (
                  <>
                    {" "}
                    <a href={`https://basescan.org/address/${REGISTRY_ADDRESS}`} target="_blank" rel="noreferrer" style={{ color: "var(--qerin-accent)" }}>
                      View the contract on Basescan ↗
                    </a>
                  </>
                )}
              </p>
            </div>
          </div>
        </section>

        {/* Status */}
        <section className="qerin-fade-up" style={{ padding: "clamp(16px, 3vw, 24px) 0", borderTop: "1px solid var(--qerin-border)", animationDelay: "340ms" }}>
          <Eyebrow>WHERE WE ARE</Eyebrow>
          <p style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55, color: "var(--qerin-text-muted)", maxWidth: 620 }}>
            Qerin is pre-launch. No live users or transaction volume yet — we&apos;d rather tell you that
            directly than dress it up.
          </p>
        </section>

        <SocialUpdates />

        {/* Footer CTA / waitlist */}
        <div className="qerin-glow-border qerin-fade-up" style={{ marginTop: "clamp(8px, 2vw, 16px)", animationDelay: "420ms" }}>
          <section id="waitlist" style={{ padding: "clamp(18px, 3.5vw, 32px)", borderRadius: 16, background: "var(--qerin-surface)" }}>
            <div style={{ fontSize: "clamp(19px, 2.6vw, 24px)", fontWeight: 700, color: "var(--qerin-text)" }}>Build with Qerin</div>
            <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.5, color: "var(--qerin-text-muted)", maxWidth: 520 }}>
              Join the waitlist for early API access.
            </p>
            <div style={{ marginTop: 16 }}>
              <WaitlistForm />
            </div>
          </section>
        </div>

        <footer
          className="qerin-fade-up"
          style={{
            marginTop: "clamp(24px, 4vw, 40px)",
            paddingTop: 20,
            borderTop: "1px solid var(--qerin-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            animationDelay: "460ms",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LogoMark size={16} />
            <span style={{ fontSize: 12.5, color: "var(--qerin-text-muted)" }}>© {new Date().getFullYear()} Qerin</span>
          </div>
          <span style={{ fontSize: 12.5, color: "var(--qerin-text-muted)" }}>Verified answers, paid in stablecoins.</span>
        </footer>
      </main>
    </div>
  );
}
