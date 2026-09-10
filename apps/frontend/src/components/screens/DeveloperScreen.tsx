"use client";

const REGISTRY_ADDRESS_BASE = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS || "0xb35788922a5b9C8938dE8AEDf725b88D26eEEa45";
const REGISTRY_ADDRESS_BOTCHAIN = process.env.NEXT_PUBLIC_BOTCHAIN_REGISTRY_ADDRESS || "0xb35788922a5b9C8938dE8AEDf725b88D26eEEa45";

export function DeveloperScreen({ onGoHome }: { onGoHome: () => void }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--qerin-bg-soft)",
        paddingBottom: 24,
        boxSizing: "border-box",
        overflowY: "auto",
      }}
    >
      <div style={{ padding: "24px 32px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 14, height: 14, background: "var(--qerin-accent)", flexShrink: 0 }} />
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--qerin-text)" }}>qerin</div>
          </div>
          <button
            onClick={onGoHome}
            className="qerin-pill-btn"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              height: 40,
              padding: "0 14px",
              borderRadius: 9999,
              border: "1px solid var(--qerin-border)",
              background: "var(--qerin-surface)",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--qerin-text)",
              cursor: "pointer",
              fontFamily: "var(--font-inter), sans-serif",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M13 8H3M3 8L7.5 3.5M3 8L7.5 12.5"
                stroke="var(--qerin-text)"
                strokeWidth="1.6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back
          </button>
        </div>
        <div style={{ marginTop: 32, fontWeight: 700, fontSize: 22, color: "var(--qerin-text)" }}>
          Qerin for developers
        </div>
        <div style={{ marginTop: 8, fontSize: 15, color: "var(--qerin-text-muted)" }}>
          Embed verified, sourced answers in your own product. Pay only when Qerin delivers one —
          no signup, no key. Your wallet pays per call over x402; the payment itself is the auth.
        </div>
      </div>

      <div
        style={{
          margin: "32px 32px 0",
          background: "var(--qerin-surface)",
          border: "1px solid var(--qerin-border)",
          borderRadius: 8,
          padding: 20,
          boxSizing: "border-box",
        }}
      >
        <div style={{ fontWeight: 500, fontSize: 12, color: "var(--qerin-text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>
          Pricing
        </div>
        <div style={{ marginTop: 12, display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontWeight: 700, fontSize: 32, color: "var(--qerin-text)" }}>
            $0.15
          </span>
          <span style={{ fontSize: 14, color: "var(--qerin-text-muted)" }}>per verified answer</span>
        </div>
        <div style={{ height: 1, background: "var(--qerin-border)", marginTop: 16 }} />
        <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, color: "var(--qerin-text-muted)" }}>Source payments</span>
          <span style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: 14, color: "var(--qerin-text)" }}>
            $0.07
          </span>
        </div>
        <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, color: "var(--qerin-text-muted)" }}>Qerin service fee</span>
          <span style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: 14, color: "var(--qerin-text)" }}>
            $0.08
          </span>
        </div>
        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: "var(--qerin-text)" }}>You pay</span>
          <span style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontWeight: 700, fontSize: 14, color: "var(--qerin-text)" }}>
            $0.15
          </span>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--qerin-text-muted)" }}>
          Charged only on successful delivery. No charge if no verified source is found.
        </div>
        <div style={{ marginTop: 4, fontSize: 12, color: "var(--qerin-text-muted)" }}>
          Same sources shown in the example receipt below.
        </div>
      </div>

      {/* Fixed dark "terminal" surface — intentionally not theme-reactive,
          same as a code editor stays dark regardless of the page around it. */}
      <div style={{ margin: "32px 32px 0", background: "#151515", borderRadius: 8, padding: 16, boxSizing: "border-box" }}>
        <div
          style={{
            fontFamily: "var(--font-ibm-plex-mono), monospace",
            fontSize: 13,
            lineHeight: 1.6,
            color: "#F7F5F0",
            whiteSpace: "pre-wrap",
          }}
        >
          {"POST /v1/paid/answer\n{\n  \"question\": "}
          <span style={{ color: "#FF9A5C" }}>{'"What happened in the\n   CryptoSlate hack this week?"'}</span>
          {"\n}\n\n"}
          <span style={{ color: "#8A8A8A" }}>
            {"// No API key. First call gets a 402 with x402\n// payment requirements; your x402-aware HTTP\n// client (e.g. @x402/fetch) signs and retries.\n// Returns a synthesized answer plus\n// an itemized, on-chain receipt."}
          </span>
        </div>
      </div>

      <div style={{ margin: "32px 32px 0", textAlign: "center", fontSize: 13, color: "var(--qerin-text-muted)" }}>
        No signup needed to start calling the API — payment is the auth.
      </div>

      <div style={{ marginTop: 16, textAlign: "center", fontSize: 13, color: "var(--qerin-text-muted)" }}>
        Every call is receipted on-chain:{" "}
        <a
          href={`https://basescan.org/address/${REGISTRY_ADDRESS_BASE}`}
          target="_blank"
          rel="noreferrer"
          style={{ color: "var(--qerin-accent)", textDecoration: "underline", marginRight: 8 }}
        >
          Base Registry ↗
        </a>
        •
        <a
          href={`https://scan.botchain.ai/address/${REGISTRY_ADDRESS_BOTCHAIN}`}
          target="_blank"
          rel="noreferrer"
          style={{ color: "var(--qerin-accent)", textDecoration: "underline", marginLeft: 8 }}
        >
          BOT Chain Registry (Chain 677) ↗
        </a>
      </div>
    </div>
  );
}
