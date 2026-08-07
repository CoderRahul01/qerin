"use client";

const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS;

export function DeveloperScreen({ onGoHome }: { onGoHome: () => void }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#F7F5F0",
        paddingBottom: 24,
        boxSizing: "border-box",
        overflowY: "auto",
      }}
    >
      <div style={{ padding: "24px 32px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 14, height: 14, background: "#0000FF", flexShrink: 0 }} />
            <div style={{ fontWeight: 700, fontSize: 15, color: "#12141A" }}>qerin</div>
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
              border: "1px solid #D8D5CC",
              background: "#FFFFFF",
              fontSize: 13,
              fontWeight: 500,
              color: "#12141A",
              cursor: "pointer",
              fontFamily: "var(--font-inter), sans-serif",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M13 8H3M3 8L7.5 3.5M3 8L7.5 12.5"
                stroke="#12141A"
                strokeWidth="1.6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back
          </button>
        </div>
        <div style={{ marginTop: 32, fontWeight: 700, fontSize: 22, color: "#12141A" }}>
          Qerin for developers
        </div>
        <div style={{ marginTop: 8, fontSize: 15, color: "#6B6E76" }}>
          Embed verified, sourced answers in your own product. Pay only when Qerin delivers one —
          no signup, no key. Your wallet pays per call over x402; the payment itself is the auth.
        </div>
      </div>

      <div
        style={{
          margin: "32px 32px 0",
          background: "#FFFFFF",
          border: "1px solid #D8D5CC",
          borderRadius: 8,
          padding: 20,
          boxSizing: "border-box",
        }}
      >
        <div style={{ fontWeight: 500, fontSize: 12, color: "#6B6E76", textTransform: "uppercase", letterSpacing: 1 }}>
          Pricing
        </div>
        <div style={{ marginTop: 12, display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontWeight: 700, fontSize: 32, color: "#12141A" }}>
            $0.15
          </span>
          <span style={{ fontSize: 14, color: "#6B6E76" }}>per verified answer</span>
        </div>
        <div style={{ height: 1, background: "#D8D5CC", marginTop: 16 }} />
        <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, color: "#6B6E76" }}>Source payments</span>
          <span style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: 14, color: "#12141A" }}>
            $0.07
          </span>
        </div>
        <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, color: "#6B6E76" }}>Qerin service fee</span>
          <span style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: 14, color: "#12141A" }}>
            $0.08
          </span>
        </div>
        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: "#12141A" }}>You pay</span>
          <span style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontWeight: 700, fontSize: 14, color: "#12141A" }}>
            $0.15
          </span>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: "#6B6E76" }}>
          Charged only on successful delivery. No charge if no verified source is found.
        </div>
        <div style={{ marginTop: 4, fontSize: 12, color: "#6B6E76" }}>
          Same sources shown in the example receipt below.
        </div>
      </div>

      <div style={{ margin: "32px 32px 0", background: "#12141A", borderRadius: 8, padding: 16, boxSizing: "border-box" }}>
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
          <span style={{ color: "#8A8AFF" }}>{'"What happened in the\n   CryptoSlate hack this week?"'}</span>
          {"\n}\n\n"}
          <span style={{ color: "#6B6E76" }}>
            {"// No API key. First call gets a 402 with x402\n// payment requirements; your x402-aware HTTP\n// client (e.g. @x402/fetch) signs and retries.\n// Returns a synthesized answer plus\n// an itemized, on-chain receipt."}
          </span>
        </div>
      </div>

      <div style={{ margin: "32px 32px 0", textAlign: "center", fontSize: 13, color: "#6B6E76" }}>
        No signup needed to start calling the API — payment is the auth.
      </div>

      <div style={{ marginTop: 16, textAlign: "center", fontSize: 13, color: "#6B6E76" }}>
        Every call is receipted on-chain.
        {REGISTRY_ADDRESS && (
          <>
            {" "}
            <a
              href={`https://basescan.org/address/${REGISTRY_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: "#0000FF", textDecoration: "underline" }}
            >
              View the receipt registry ↗
            </a>
          </>
        )}
      </div>
    </div>
  );
}
