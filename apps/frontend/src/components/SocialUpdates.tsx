const posts = [
  {
    date: "Aug 7",
    quote:
      "AI answers arrive with no proof. Qerin pays every source it reads — per query, in stablecoins. You get the answer plus an itemized receipt: source, amount, tx hash.",
  },
  {
    date: "Aug 7",
    quote:
      "Live on Base today. Receipt contract deployed and source-verified on mainnet. Built and shipped solo.",
  },
  {
    date: "Aug 7",
    quote:
      "One question in, one answer out, and a receipt you can open on the explorer and check yourself.",
  },
];

const PROFILE_URL = "https://x.com/qerinai_26";

function XMark() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 2l12 12M14 2L2 14" stroke="var(--qerin-text)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function SocialUpdates() {
  return (
    <section
      className="qerin-fade-up"
      style={{ padding: "clamp(12px, 2.5vw, 20px) 0", borderTop: "1px solid var(--qerin-border)", animationDelay: "220ms" }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--qerin-text)" }}>Recent updates</div>
        <a
          href={PROFILE_URL}
          target="_blank"
          rel="noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: "var(--qerin-text-muted)" }}
        >
          <XMark />
          @qerinai_26
        </a>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {posts.map((post) => (
          <a
            key={post.quote}
            href={PROFILE_URL}
            target="_blank"
            rel="noreferrer"
            className="qerin-pill-btn"
            style={{
              display: "block",
              padding: 16,
              borderRadius: 12,
              border: "1px solid var(--qerin-border)",
              background: "var(--qerin-surface)",
              textDecoration: "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <XMark />
              <span style={{ fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: 11, color: "var(--qerin-text-muted)" }}>
                {post.date}
              </span>
            </div>
            <p style={{ marginTop: 10, fontSize: 13.5, lineHeight: 1.5, color: "var(--qerin-text)" }}>{post.quote}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
