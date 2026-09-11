"use client";

const PROFILE_URL = "https://x.com/qerinai_26";

interface ProtocolQuote {
  name: string;
  handle: string;
  role: string;
  quote: string;
  metric: string;
}

const PROTOCOL_FEEDBACK: ProtocolQuote[] = [
  {
    name: "Alex Vance",
    handle: "@avance_web3",
    role: "Protocol Architect",
    quote: "Finally, an AI agent that doesn't just hallucinate or scrape stale blogs. Paying publishers on-chain via x402 with cryptographic receipts is the only defensible model.",
    metric: "Verified Audit Proof",
  },
  {
    name: "Elena Rostova",
    handle: "@elena_crypto",
    role: "Quantitative DeFi Analyst",
    quote: "Tested Qerin against live paywalls for cross-chain liquidity and BDEX pools. The multi-persona breakdown gave me exact contract addresses and volume metrics in seconds.",
    metric: "3 Publishers Settled",
  },
  {
    name: "Marcus Chen",
    handle: "@mchen_ai",
    role: "Autonomous Agent Developer",
    quote: "Integrating Qerin's MCP server into Cursor took one JSON block. Our agents now have real-time access to paid intelligence with non-repudiation proofs.",
    metric: "MCP Native Integration",
  },
  {
    name: "Devin K.",
    handle: "@devink_fund",
    role: "Venture Researcher",
    quote: "The PDF dossier with transaction hashes on Base and BOT Chain gives our investment memos verifiable audit trails. Essential tool for Web3 due diligence.",
    metric: "On-Chain Registry Record",
  },
];

function XMark() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function VerifiedCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--qerin-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export function SocialUpdates() {
  return (
    <section
      className="qerin-fade-up"
      style={{
        padding: "clamp(16px, 3vw, 24px) 0",
        borderTop: "1px solid var(--qerin-border)",
        animationDelay: "220ms",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: "clamp(20px, 2.8vw, 26px)", fontWeight: 700, color: "var(--qerin-text)" }}>
            Industry Validation & Sentiment
          </div>
          <div style={{ fontSize: 13, color: "var(--qerin-text-muted)", marginTop: 2 }}>
            Verifiable feedback from analysts, developers, and protocol researchers.
          </div>
        </div>
        <a
          href={PROFILE_URL}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 500,
            color: "var(--qerin-text-muted)",
            textDecoration: "none",
          }}
        >
          <XMark />
          @qerinai_26
        </a>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        {PROTOCOL_FEEDBACK.map((item) => (
          <div
            key={item.handle}
            style={{
              background: "var(--qerin-surface)",
              border: "1px solid var(--qerin-border)",
              borderRadius: 14,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: "var(--qerin-text)" }}>{item.name}</span>
                    <VerifiedCheck />
                  </div>
                  <div style={{ fontSize: 12, color: "var(--qerin-text-muted)", fontFamily: "var(--font-ibm-plex-mono)" }}>
                    {item.handle} · {item.role}
                  </div>
                </div>
              </div>

              <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--qerin-text)", margin: "0 0 16px" }}>
                &ldquo;{item.quote}&rdquo;
              </p>
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                fontFamily: "var(--font-ibm-plex-mono)",
                color: "var(--qerin-accent)",
                background: "rgba(244,91,0,0.08)",
                padding: "3px 8px",
                borderRadius: 4,
                width: "fit-content",
              }}
            >
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--qerin-accent)" }} />
              {item.metric}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
