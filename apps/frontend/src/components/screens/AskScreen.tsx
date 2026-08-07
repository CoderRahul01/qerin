import { LogoRow } from "../StatusBar";

export function AskScreen({
  questionValue,
  onQuestionChange,
  onKeyDown,
  onSubmit,
  onGoDeveloper,
  errorMessage,
  balance,
  onTopupClick,
}: {
  questionValue: string;
  onQuestionChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  onGoDeveloper: () => void;
  errorMessage?: string | null;
  balance: number | null;
  onTopupClick: () => void;
}) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#F7F5F0",
        paddingBottom: 24,
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          marginTop: 20,
        }}
      >
        <LogoRow padding="0" />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={onTopupClick}
            className="qerin-pill-btn"
            style={{
              height: 40,
              padding: "0 14px",
              borderRadius: 9999,
              border: "1px solid #D8D5CC",
              background: "#FFFFFF",
              fontSize: 13,
              fontWeight: 500,
              color: "#12141A",
              cursor: "pointer",
              fontFamily: "var(--font-ibm-plex-mono), monospace",
            }}
          >
            {balance === null ? "…" : `$${balance.toFixed(2)}`}
          </button>
          <button
            onClick={onGoDeveloper}
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
            For developers
            <svg width="10" height="10" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M4 12L12 4M12 4H5M12 4V11"
                stroke="#12141A"
                strokeWidth="1.6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 32px",
          gap: 32,
        }}
      >
        <svg width="180" height="90" viewBox="0 0 240 120" style={{ display: "block" }}>
          <path
            d="M6 55 C 40 15, 90 20, 118 58 C 140 88, 178 92, 200 56"
            fill="none"
            stroke="#D8D5CC"
            strokeWidth="1.5"
            strokeDasharray="4 5"
          />
          <rect x="6" y="34" width="52" height="36" rx="6" fill="none" stroke="#12141A" strokeWidth="1.5" />
          <path
            d="M18 70 L14 82 L28 70 Z"
            fill="none"
            stroke="#12141A"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <text
            x="32"
            y="57"
            fontFamily="Inter,sans-serif"
            fontWeight="700"
            fontSize="20"
            fill="#12141A"
            textAnchor="middle"
          >
            ?
          </text>
          <rect x="103" y="43" width="30" height="30" fill="#0000FF" />
          <path d="M178 24 h34 v34 l-8.5 8 -8.5 -8 -8.5 8 -8.5 -8 z" fill="#12141A" />
          <line x1="185" y1="35" x2="205" y2="35" stroke="#F7F5F0" strokeWidth="2" />
          <line x1="185" y1="45" x2="205" y2="45" stroke="#F7F5F0" strokeWidth="2" />
        </svg>
        <div style={{ fontSize: 17, color: "#6B6E76", textAlign: "center" }}>
          Ask anything. Qerin pays for the truth.
        </div>
        <div style={{ width: "100%", position: "relative" }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            style={{
              position: "absolute",
              left: 16,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
            }}
          >
            <rect x="5.5" y="1" width="5" height="8" rx="2.5" fill="none" stroke="#6B6E76" strokeWidth="1.3" />
            <path
              d="M3 8.5c0 2.8 2.2 5 5 5s5-2.2 5-5M8 13.5v2"
              fill="none"
              stroke="#6B6E76"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
          <input
            placeholder="Type your question"
            value={questionValue}
            onChange={(e) => onQuestionChange(e.target.value)}
            onKeyDown={onKeyDown}
            style={{
              width: "100%",
              height: 56,
              background: "#FFFFFF",
              border: "1px solid #D8D5CC",
              borderRadius: 12,
              boxSizing: "border-box",
              padding: "0 56px 0 44px",
              fontSize: 15,
              color: "#12141A",
              outline: "none",
              fontFamily: "var(--font-inter), sans-serif",
            }}
          />
          <button
            onClick={onSubmit}
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              width: 40,
              height: 40,
              borderRadius: 9999,
              background: "#0000FF",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path
                d="M8 13V3M3 7l5-5 5 5"
                stroke="#F7F5F0"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        {errorMessage && (
          <div style={{ fontSize: 13, color: "#B23B3B", textAlign: "center" }}>{errorMessage}</div>
        )}
      </div>
    </div>
  );
}
