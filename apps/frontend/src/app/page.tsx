import { Nav } from "@/components/Nav";
import { LogoMark } from "@/components/LogoMark";
import { StepsFlow, type FlowStep } from "@/components/StepsFlow";
import { SocialUpdates } from "@/components/SocialUpdates";
import { HeroScene } from "@/components/HeroScene";
import { SOURCES, SourceIcon } from "@/components/SourceIcon";
import { DimensionalBadge } from "@/components/DimensionalBadge";

const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS || "0xb35788922a5b9C8938dE8AEDf725b88D26eEEa45";
const DUNE_HUB_URL = "https://dune.com/qerin26/qerin-protocol-autonomous-ai-agent-analytics-bot-chain-hub";

const featureStrip = [
  {
    label: "x402 Micropayments",
    detail: "Built for autonomous machine-to-machine payments.",
    icon: <path d="M11 2L4 12h6l-1 8 8-11h-6l1-7Z" fill="var(--qerin-accent)" />,
  },
  {
    label: "Multi-Persona Synthesis",
    detail: "Developer, Founder, Content Writer, and Trader insights.",
    icon: (
      <>
        <circle cx="10" cy="7" r="3.5" stroke="var(--qerin-accent)" strokeWidth="1.5" fill="none" />
        <path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="var(--qerin-accent)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </>
    ),
  },
  {
    label: "Dual-Chain Settlement",
    detail: "Base Mainnet (8453) + BOT Chain Layer 1 (677).",
    icon: (
      <>
        <circle cx="10" cy="10" r="7.5" stroke="var(--qerin-accent)" strokeWidth="1.6" fill="none" />
        <path d="M10 2.5a7.5 7.5 0 0 1 0 15Z" fill="var(--qerin-accent)" />
      </>
    ),
  },
  {
    label: "Verified PDF Dossiers",
    detail: "Downloadable research reports backed by on-chain proofs.",
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
    title: "1. Submit your research query",
    body: "Ask any technical, market, or strategic question in natural language. Qerin auto-generates a dynamic topic name.",
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
    title: "2. Qerin executes on-chain micropayment",
    body: "Autonomous x402 micropayments settle directly on Base or BOT Chain — paying publishers and APIs for raw, premium data.",
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
    title: "3. Multi-persona intelligence synthesis",
    body: "Content is analyzed and partitioned into an Executive Summary plus specialized Developer, Founder, Writer, and Trader lenses.",
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
    title: "4. Cryptographic receipt minted on-chain",
    body: "Receipt is recorded to QerinReceiptRegistry.sol with transaction hash and itemized paywall disbursements.",
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
  {
    title: "5. Download verified research dossier",
    body: "Export a complete, publication-ready PDF research dossier complete with on-chain links and methodology citations.",
    icon: (
      <>
        <path d="M4 17h16M12 3v11M8 10l4 4 4-4" stroke="var(--qerin-accent)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
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

function PillLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: 48,
        padding: "0 26px",
        borderRadius: 9999,
        background: "var(--qerin-accent)",
        color: "var(--qerin-accent-contrast)",
        fontWeight: 600,
        fontSize: 15,
        textDecoration: "none",
        boxShadow: "0 4px 16px rgba(244,91,0,0.25)",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
      }}
    >
      {children}
    </a>
  );
}

function OutlinePillLink({ href, children, external }: { href: string; children: React.ReactNode; external?: boolean }) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="qerin-pill-btn"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: 48,
        padding: "0 24px",
        borderRadius: 9999,
        background: "var(--qerin-surface)",
        border: "1px solid var(--qerin-border)",
        color: "var(--qerin-text)",
        fontWeight: 600,
        fontSize: 15,
        textDecoration: "none",
        transition: "border-color 0.15s ease, background 0.15s ease",
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
                gap: 6,
                height: 28,
                padding: "0 12px",
                borderRadius: 9999,
                border: "1px solid var(--qerin-border)",
                background: "var(--qerin-bg-soft)",
                fontFamily: "var(--font-ibm-plex-mono), monospace",
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: "0.06em",
                color: "var(--qerin-accent)",
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
              LIVE ON PRODUCTION • BASE + BOT CHAIN
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
              Qerin is an autonomous AI agent protocol that pays real x402 micropayments to premium data sources,
              retrieves verified intelligence, and provides on-chain cryptographic receipts and multi-persona research dossiers.
            </p>
            <div style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <PillLink href="/app">Launch Agent Workspace →</PillLink>
              <OutlinePillLink href={DUNE_HUB_URL} external>
                Dune Analytics Hub ↗
              </OutlinePillLink>
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <HeroScene />
          </div>
        </section>

        {/* Trusted sources */}
        <section className="qerin-fade-up" style={{ padding: "clamp(16px, 3vw, 20px) 0", borderTop: "1px solid var(--qerin-border)", animationDelay: "60ms" }}>
          <div style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", color: "var(--qerin-text-muted)" }}>
            VERIFIED DATA SOURCES & NETWORKS
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
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 34,
                padding: "0 12px",
                borderRadius: 9999,
                border: "1px solid rgba(139,92,246,0.35)",
                background: "rgba(139,92,246,0.08)",
                color: "#8b5cf6",
                fontSize: 13.5,
                fontWeight: 600,
              }}
            >
              <span>BOT Chain L1 (677)</span>
            </div>
          </div>
        </section>

        {/* Feature strip */}
        <section id="features" className="qerin-fade-up" style={{ padding: "clamp(20px, 3.5vw, 32px) 0", borderTop: "1px solid var(--qerin-border)", animationDelay: "100ms" }}>
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

        {/* The Problem */}
        <section className="qerin-fade-up" style={{ padding: "clamp(16px, 3vw, 24px) 0", borderTop: "1px solid var(--qerin-border)", animationDelay: "140ms" }}>
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
                Paywalled publishers, proprietary datasets, and premium API services block AI agents or demand manual human billing.
                There is zero verifiable cryptographic record of what was accessed, how much was paid, or the authentic source provenance.
              </p>
            </div>
          </div>
        </section>

        {/* The Solution */}
        <section className="qerin-fade-up" style={{ padding: "clamp(16px, 3vw, 24px) 0", borderTop: "1px solid var(--qerin-border)", animationDelay: "180ms" }}>
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
                An agent that pays, verifies, and delivers institutional intelligence
              </div>
              <p style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55, color: "var(--qerin-text-muted)", maxWidth: 620 }}>
                Qerin executes machine-to-machine x402 micropayments in USDC on Base and BOT Chain, retrieves the verified payload,
                and partitions the answer across specialized personas (Developer, Founder, Content Writer, Trader) with an on-chain receipt registry.
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="qerin-fade-up" style={{ padding: "clamp(16px, 3vw, 24px) 0", borderTop: "1px solid var(--qerin-border)", animationDelay: "220ms" }}>
          <Eyebrow>HOW IT WORKS</Eyebrow>
          <div style={{ marginTop: 16 }}>
            <StepsFlow steps={howItWorks} label="How Qerin works" />
          </div>
        </section>

        {/* Proof */}
        <section id="proof" className="qerin-fade-up" style={{ padding: "clamp(16px, 3vw, 24px) 0", borderTop: "1px solid var(--qerin-border)", animationDelay: "260ms" }}>
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
              <Eyebrow>ON-CHAIN PROOF & TRANSPARENCY</Eyebrow>
              <div style={{ marginTop: 8, fontSize: "clamp(20px, 2.8vw, 26px)", fontWeight: 700, color: "var(--qerin-text)" }}>
                Verified on-chain smart contracts & Dune analytics
              </div>
              <p style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55, color: "var(--qerin-text-muted)", maxWidth: 620 }}>
                <code>QerinReceiptRegistry.sol</code> is deployed and source-verified on Base mainnet and fully prepared for BOT Chain mainnet deployment.
                Track live verification metrics and throughput on our official Dune Intelligence Hub.
              </p>
              <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 14 }}>
                <a
                  href={`https://basescan.org/address/${REGISTRY_ADDRESS}#code`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 13.5, fontWeight: 600, color: "var(--qerin-accent)", textDecoration: "none" }}
                >
                  View Smart Contract on Basescan ↗
                </a>
                <span style={{ color: "var(--qerin-border)" }}>•</span>
                <a
                  href={DUNE_HUB_URL}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 13.5, fontWeight: 600, color: "#8b5cf6", textDecoration: "none" }}
                >
                  Official Dune Analytics Hub ↗
                </a>
                <span style={{ color: "var(--qerin-border)" }}>•</span>
                <a
                  href="https://scan.botchain.ai/"
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 13.5, fontWeight: 600, color: "var(--qerin-text-muted)", textDecoration: "none" }}
                >
                  BOT Chain Explorer ↗
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Production Status */}
        <section className="qerin-fade-up" style={{ padding: "clamp(16px, 3vw, 24px) 0", borderTop: "1px solid var(--qerin-border)", animationDelay: "300ms" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
            <Eyebrow>PRODUCTION PROTOCOL STATUS</Eyebrow>
          </div>
          <p style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55, color: "var(--qerin-text-muted)", maxWidth: 620 }}>
            Qerin is fully live in production. You can execute real autonomous AI queries, verify on-chain settlements,
            switch seamlessly between Base (8453) and BOT Chain (677), and export verified PDF research dossiers right now.
          </p>
        </section>

        <SocialUpdates />

        {/* Launch App Card (Replaces Waitlist) */}
        <div className="qerin-glow-border qerin-fade-up" style={{ marginTop: "clamp(12px, 2.5vw, 24px)", animationDelay: "380ms" }}>
          <section style={{ padding: "clamp(24px, 4vw, 36px)", borderRadius: 16, background: "var(--qerin-surface)", textAlign: "center" }}>
            <div style={{ fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 700, color: "var(--qerin-text)" }}>
              Ready to experience autonomous AI settlement?
            </div>
            <p style={{ marginTop: 10, fontSize: 15, lineHeight: 1.55, color: "var(--qerin-text-muted)", maxWidth: 540, margin: "10px auto 0" }}>
              No waitlist or credit card required. Launch the workspace to ask questions, view multi-persona synthesis, and verify cryptographic receipts live.
            </p>
            <div style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              <PillLink href="/app">Launch Qerin App Now →</PillLink>
              <OutlinePillLink href={DUNE_HUB_URL} external>
                View Live Dune Hub ↗
              </OutlinePillLink>
            </div>
            <div style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 18, flexWrap: "wrap", fontSize: 12.5, color: "var(--qerin-text-muted)" }}>
              <span>⚡ Sub-second synthesis</span>
              <span>•</span>
              <span>🛡️ 100% Cryptographic verification</span>
              <span>•</span>
              <span>📄 Instant PDF dossier export</span>
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
            animationDelay: "420ms",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LogoMark size={16} />
            <span style={{ fontSize: 12.5, color: "var(--qerin-text-muted)" }}>© {new Date().getFullYear()} Qerin Protocol</span>
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 12.5, color: "var(--qerin-text-muted)" }}>
            <a href="/app" style={{ color: "var(--qerin-text-muted)", textDecoration: "none" }}>App</a>
            <a href={DUNE_HUB_URL} target="_blank" rel="noreferrer" style={{ color: "var(--qerin-text-muted)", textDecoration: "none" }}>Dune Analytics</a>
            <a href="https://x.com/qerinai_26" target="_blank" rel="noreferrer" style={{ color: "var(--qerin-text-muted)", textDecoration: "none" }}>Twitter (X)</a>
          </div>
        </footer>
      </main>
    </div>
  );
}
