import { Tweet } from "react-tweet";

const TWEET_IDS = ["2089406704601719270", "2089429079691084061", "2089444150894878826", "2089601380491186248"];

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
        <div style={{ fontSize: "clamp(20px, 2.8vw, 26px)", fontWeight: 700, color: "var(--qerin-text)" }}>People are noticing</div>
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

      <div className="qerin-tweet-grid">
        {TWEET_IDS.map((id) => (
          <div key={id} className="qerin-tweet-card">
            <Tweet id={id} />
          </div>
        ))}
      </div>
    </section>
  );
}
