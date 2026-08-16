const steps = [
  {
    title: "Ask a question",
    body: "Anything about crypto, markets, or research — Qerin never answers from memory.",
    icon: (
      <path
        d="M8 8.5c0-2.2 1.8-4 4-4s4 1.8 4 4c0 1.6-1 2.4-2 3.1-.8.6-1.5 1.1-1.5 2.2M12 18.2v.1"
        stroke="#0000FF"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: "Qerin pays for sources",
    body: "An agent picks the right paid research platforms and pays each one in USDC on Base, live.",
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
    title: "Get a verified answer",
    body: "A synthesized answer with every source, price, and on-chain receipt — nothing hidden.",
    icon: (
      <path
        d="M7 12.5l3.3 3.3L17.5 8.4"
        stroke="#0000FF"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
];

export function StepsFlow() {
  return (
    <div className="qerin-flow" role="list" aria-label="How Qerin works">
      {steps.map((step, i) => {
        const hasNext = i < steps.length - 1;
        return (
          <div className={`qerin-flow-item${hasNext ? "" : " qerin-flow-item-last"}`} key={step.title} role="listitem">
            <div className="qerin-flow-icon-wrap">
              <div className="qerin-flow-node-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                  {step.icon}
                </svg>
              </div>
              {hasNext && (
                <div className="qerin-flow-connector" aria-hidden="true">
                  <div className="qerin-flow-connector-line" />
                  <div className="qerin-flow-dot" />
                </div>
              )}
            </div>
            <div className="qerin-flow-node-body">
              <div
                style={{
                  fontFamily: "var(--font-ibm-plex-mono), monospace",
                  fontSize: 11,
                  color: "#6B6E76",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                }}
              >
                STEP {i + 1}
              </div>
              <div style={{ marginTop: 4, fontSize: 16, fontWeight: 600, color: "#12141A" }}>{step.title}</div>
              <div style={{ marginTop: 4, fontSize: 13.5, lineHeight: 1.5, color: "#6B6E76" }}>{step.body}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
