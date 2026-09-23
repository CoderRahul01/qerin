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
          Direct API billing is paused while we finish refunds for failed answers.
          Use the Qerin app for early-access research with a personal balance.
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
          <span style={{ fontSize: 14, color: "var(--qerin-text-muted)" }}>per delivered app answer</span>
        </div>
        <div style={{ height: 1, background: "var(--qerin-border)", marginTop: 16 }} />
        <div style={{ marginTop: 16, fontSize: 14, color: "var(--qerin-text-muted)" }}>
          Paid source costs vary by query. Your receipt lists each successful source payment.
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
          Source selection is limited to relevant providers and a per-answer budget.
        </div>
      </div>

      <div style={{ margin: "32px 32px 0", textAlign: "center", fontSize: 13, color: "var(--qerin-text-muted)" }}>
        API keys and direct x402 calls are unavailable during early access.
      </div>

      <div style={{ marginTop: 16, textAlign: "center", fontSize: 13, color: "var(--qerin-text-muted)" }}>
        Check confirmed receipt transactions on:{" "}
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
