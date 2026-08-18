import { useState } from "react";
import { LogoRow } from "../StatusBar";

export interface ReceiptLine {
  name: string;
  amountLabel: string;
  hash: string;
  explorerUrl: string;
  content: unknown;
}

// Paid sources return whatever shape they return — try the common field
// names for article-style bodies before falling back to raw JSON, so the
// full paid content is at least readable rather than a wall of escaped text.
function extractReadableContent(content: unknown): string {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (typeof content === "object") {
    const obj = content as Record<string, unknown>;
    for (const key of ["content", "text", "body", "article", "result", "answer"]) {
      const value = obj[key];
      if (typeof value === "string" && value.trim()) return value;
    }
  }
  return JSON.stringify(content, null, 2);
}

const zigzag = (
  <svg width="100%" height="10" viewBox="0 0 320 10" preserveAspectRatio="none" style={{ display: "block" }}>
    <polyline
      points="0,10 10,0 20,10 30,0 40,10 50,0 60,10 70,0 80,10 90,0 100,10 110,0 120,10 130,0 140,10 150,0 160,10 170,0 180,10 190,0 200,10 210,0 220,10 230,0 240,10 250,0 260,10 270,0 280,10 290,0 300,10 310,0 320,10"
      fill="none"
      stroke="var(--qerin-border)"
      strokeWidth="1"
    />
  </svg>
);

export function AnswerScreen({
  question,
  answer,
  totalLabel,
  receiptLines,
  onReset,
}: {
  question: string;
  answer: string;
  totalLabel: string;
  receiptLines: ReceiptLine[];
  onReset: () => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (name: string) => setExpanded((e) => ({ ...e, [name]: !e[name] }));

  const cardUrl = `/api/card?${new URLSearchParams({
    question,
    answer,
    sourceCount: String(receiptLines.length),
    total: totalLabel.replace(/^\$/, ""),
  }).toString()}`;

  const onDownload = () => {
    const payload = {
      question,
      answer,
      totalPaid: totalLabel,
      sources: receiptLines.map((line) => ({
        name: line.name,
        amountPaid: line.amountLabel,
        txHash: line.hash,
        explorerUrl: line.explorerUrl,
        content: line.content,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qerin-sources-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
      <LogoRow padding="0 24px" marginTop={20} />
      <div style={{ padding: "24px 24px 0" }}>
        <div style={{ fontWeight: 500, fontSize: 14, color: "var(--qerin-text-muted)" }}>{question}</div>
        <div style={{ marginTop: 16, fontSize: 17, lineHeight: 1.5, color: "var(--qerin-text)" }}>{answer}</div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <button
            onClick={onDownload}
            style={{
              marginTop: 16,
              background: "none",
              border: "none",
              padding: 0,
              fontSize: 13,
              fontWeight: 500,
              color: "var(--qerin-accent)",
              cursor: "pointer",
              fontFamily: "var(--font-inter), sans-serif",
            }}
          >
            Download full sources ↓
          </button>
          <a
            href={cardUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              marginTop: 16,
              fontSize: 13,
              fontWeight: 500,
              color: "var(--qerin-accent)",
              fontFamily: "var(--font-inter), sans-serif",
            }}
          >
            Share as card ↗
          </a>
        </div>
      </div>
      <div style={{ margin: "32px 24px 0" }}>
        <div style={{ position: "relative" }}>
          {zigzag}
          <div style={{ background: "var(--qerin-bg-soft)", borderLeft: "1px solid var(--qerin-border)", borderRight: "1px solid var(--qerin-border)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                padding: "16px 20px",
              }}
            >
              <div style={{ fontSize: 13, color: "var(--qerin-text-muted)" }}>Total paid</div>
              <div
                style={{
                  fontFamily: "var(--font-ibm-plex-mono), monospace",
                  fontWeight: 700,
                  fontSize: 28,
                  color: "var(--qerin-text)",
                }}
              >
                {totalLabel}
              </div>
            </div>
            <div style={{ height: 1, background: "var(--qerin-border)" }} />
            {receiptLines.map((line, i) => (
              <div
                key={line.name}
                style={{
                  padding: "16px 20px",
                  borderBottom: i < receiptLines.length - 1 ? "1px solid var(--qerin-border)" : undefined,
                  boxSizing: "border-box",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 9999,
                      background: "#1B7A4A",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    <svg width="8" height="7" viewBox="0 0 8 7">
                      <path
                        d="M1 3.5l2.2 2.2L7 1"
                        stroke="var(--qerin-bg-soft)"
                        strokeWidth="1.6"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                      <div style={{ fontWeight: 500, fontSize: 15, color: "var(--qerin-text)" }}>{line.name}</div>
                      <div
                        style={{
                          fontFamily: "var(--font-ibm-plex-mono), monospace",
                          fontSize: 15,
                          color: "var(--qerin-text)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {line.amountLabel}
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-ibm-plex-mono), monospace",
                        fontSize: 11,
                        color: "var(--qerin-text-muted)",
                        marginTop: 4,
                      }}
                    >
                      {line.hash} —{" "}
                      <a
                        href={line.explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "var(--qerin-accent)", textDecoration: "underline" }}
                      >
                        View on Basescan
                      </a>
                    </div>
                    {line.content != null && (
                      <>
                        <button
                          onClick={() => toggle(line.name)}
                          style={{
                            marginTop: 8,
                            background: "none",
                            border: "none",
                            padding: 0,
                            fontSize: 12,
                            fontWeight: 500,
                            color: "var(--qerin-accent)",
                            cursor: "pointer",
                            fontFamily: "var(--font-inter), sans-serif",
                          }}
                        >
                          {expanded[line.name] ? "Hide full source content" : "Show full source content"}
                        </button>
                        {expanded[line.name] && (
                          <div
                            style={{
                              marginTop: 10,
                              padding: 12,
                              background: "var(--qerin-surface)",
                              border: "1px solid var(--qerin-border)",
                              borderRadius: 6,
                              fontSize: 13,
                              lineHeight: 1.55,
                              color: "var(--qerin-text)",
                              whiteSpace: "pre-wrap",
                              maxHeight: 240,
                              overflowY: "auto",
                            }}
                          >
                            {extractReadableContent(line.content)}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ transform: "scaleY(-1)" }}>{zigzag}</div>
        </div>
      </div>
      <div style={{ margin: "24px 24px 0" }}>
        <button
          onClick={onReset}
          style={{
            width: "100%",
            height: 48,
            background: "transparent",
            border: "1px solid var(--qerin-text)",
            borderRadius: 8,
            fontWeight: 500,
            fontSize: 15,
            color: "var(--qerin-text)",
            cursor: "pointer",
            fontFamily: "var(--font-inter), sans-serif",
          }}
        >
          Ask another question
        </button>
      </div>
    </div>
  );
}
