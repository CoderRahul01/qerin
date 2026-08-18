import type { ReactNode } from "react";

export interface FlowStep {
  title: string;
  body: string;
  icon: ReactNode;
}

export function StepsFlow({ steps, label }: { steps: FlowStep[]; label: string }) {
  return (
    <div className="qerin-flow" role="list" aria-label={label}>
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
                  color: "var(--qerin-text-muted)",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                }}
              >
                STEP {i + 1}
              </div>
              <div style={{ marginTop: 4, fontSize: 16, fontWeight: 600, color: "var(--qerin-text)" }}>{step.title}</div>
              <div style={{ marginTop: 4, fontSize: 13.5, lineHeight: 1.5, color: "var(--qerin-text-muted)" }}>{step.body}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
