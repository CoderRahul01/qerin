import { LogoRow } from "../StatusBar";
import type { PaySource } from "@/lib/types";

function fmt(n: number) {
  return parseFloat(n.toFixed(4)).toString();
}

export function PayingScreen({ question, paySteps }: { question: string; paySteps: PaySource[] }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--qerin-bg-soft)",
        paddingBottom: 24,
        boxSizing: "border-box",
      }}
    >
      <LogoRow padding="0 24px" marginTop={20} />
      <div style={{ padding: "32px 24px 0", fontWeight: 500, fontSize: 16, color: "var(--qerin-text)" }}>
        {question}
      </div>
      <div style={{ marginTop: 32 }}>
        {paySteps.map((step, i) => {
          const statusText =
            step.status === "paid" ? `Paid $${fmt(step.amount)}` : step.status === "paying" ? "Paying…" : "Waiting";
          const statusColor = step.status === "paid" ? "#1B7A4A" : step.status === "paying" ? "var(--qerin-text-muted)" : "var(--qerin-border)";
          const nameColor = step.status === "waiting" ? "var(--qerin-text-muted)" : "var(--qerin-text)";
          return (
            <div
              key={step.name}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                height: 72,
                padding: "0 24px",
                borderBottom: i < paySteps.length - 1 ? "1px solid var(--qerin-border)" : "none",
                boxSizing: "border-box",
              }}
            >
              <div>
                <div style={{ fontWeight: 500, fontSize: 15, color: nameColor }}>{step.name}</div>
                <div
                  style={{
                    fontFamily: "var(--font-ibm-plex-mono), monospace",
                    fontSize: 13,
                    color: statusColor,
                    marginTop: 4,
                  }}
                >
                  {statusText}
                </div>
              </div>
              {step.status === "paid" && (
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 9999,
                    background: "#1B7A4A",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    animation: "qerin-stamp 0.4s ease-out",
                  }}
                >
                  <svg width="12" height="10" viewBox="0 0 12 10">
                    <path
                      d="M1 5l3.5 3.5L11 1"
                      stroke="var(--qerin-bg-soft)"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
              {step.status === "paying" && (
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 9999,
                    border: "2px solid var(--qerin-border)",
                    borderTopColor: "var(--qerin-accent)",
                    animation: "qerin-spin 0.8s linear infinite",
                  }}
                />
              )}
              {step.status === "waiting" && (
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 9999,
                    border: "1.5px solid var(--qerin-border)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "var(--qerin-text-muted)" }}>
        Qerin is paying for verified sources
      </div>
    </div>
  );
}
