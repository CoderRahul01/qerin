"use client";

import { useState } from "react";
import { INITIAL_FOUNDER_INSIGHTS } from "../lib/data";
import { FounderChatInsight, ProtocolMetrics } from "../lib/types";

interface GrowthTabProps {
  metrics: ProtocolMetrics;
  onNavigateTab: (tab: string) => void;
}

export function GrowthTab({ metrics, onNavigateTab }: GrowthTabProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<FounderChatInsight>(
    INITIAL_FOUNDER_INSIGHTS[0]
  );

  const handleCopyPost = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", padding: "4px 16px 20px 16px" }}>
      {/* Title */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <h2 style={{ fontFamily: "var(--font-headline)", fontSize: 20, fontWeight: 700, color: "var(--text-dark)" }}>
            Founder Growth & Chat Hub
          </h2>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              padding: "2px 7px",
              borderRadius: 4,
              background: "var(--primary-pill-bg)",
              color: "var(--primary-pill-text)",
              fontFamily: "var(--font-mono)",
            }}
          >
            FOUNDER MODE
          </span>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
          Real user conversations, actionable content prompts, and friction diagnostics to accelerate protocol growth.
        </p>
      </div>

      {/* Real Inflow & Unit Economics Bento */}
      <section
        style={{
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(139, 92, 246, 0.06) 100%)",
          border: "1px solid var(--border-card)",
          borderRadius: 16,
          padding: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--primary-container)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              LIVE USER MONEY INFLOW
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--text-dark)", marginTop: 2 }}>
              ${metrics.totalRevenueUsd.toFixed(2)} USD
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--primary-pill-text)", background: "var(--primary-pill-bg)", padding: "3px 8px", borderRadius: 8 }}>
              {metrics.grossMarginPct}% Net Margin
            </div>
            <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 4 }}>
              ${metrics.agentSourceSpendUsd.toFixed(2)} Agent Compute Cost
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border-subtle)" }}>
          <div>
            <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>Total Queries</div>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-dark)", marginTop: 2 }}>
              {metrics.totalQueries} Settled
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>Fee Per Query</div>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-dark)", marginTop: 2 }}>
              $0.22 USD
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>Net Retained</div>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--primary-container)", marginTop: 2 }}>
              ${(metrics.totalRevenueUsd - metrics.agentSourceSpendUsd).toFixed(2)} USD
            </div>
          </div>
        </div>
      </section>

      {/* What Users Are Chatting About */}
      <section className="settlement-receipt-card" style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "var(--accent-purple)" }}>
              forum
            </span>
            <span style={{ fontFamily: "var(--font-headline)", fontSize: 14, fontWeight: 700, color: "var(--text-dark)" }}>
              What Users Are Chatting About
            </span>
          </div>
          <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
            5 Active Topics
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {INITIAL_FOUNDER_INSIGHTS.map((item) => {
            const isSelected = selectedInsight.id === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedInsight(item)}
                style={{
                  background: isSelected ? "var(--bg-card)" : "var(--bg-card-subtle)",
                  border: isSelected ? "1px solid var(--primary-container)" : "1px solid var(--border-subtle)",
                  borderRadius: 12,
                  padding: "10px 12px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <strong style={{ fontSize: 13, color: "var(--text-dark)" }}>{item.topic}</strong>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "1px 5px",
                          borderRadius: 4,
                          background: "var(--bg-container)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {item.category}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4, fontStyle: "italic", lineHeight: 1.35 }}>
                      &ldquo;{item.userQuery}&rdquo;
                    </p>
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--text-dark)" }}>
                      {item.queryCount} queries
                    </div>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        color: item.viralScore > 90 ? "var(--primary-pill-text)" : "var(--accent-orange)",
                        background: item.viralScore > 90 ? "var(--primary-pill-bg)" : "rgba(244, 91, 0, 0.1)",
                        padding: "1px 5px",
                        borderRadius: 4,
                        display: "inline-block",
                        marginTop: 2,
                      }}
                    >
                      {item.viralScore}% VIRAL
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 6, borderTop: "1px solid var(--border-subtle)", fontSize: 11 }}>
                  <span style={{ color: "var(--primary)", fontWeight: 600 }}>
                    💡 Builder Insight: {item.founderAction}
                  </span>
                  <span className="material-symbols-outlined" style={{ fontSize: "15px", color: "var(--text-secondary)" }}>
                    {isSelected ? "expand_less" : "chevron_right"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 1-Click Viral Content Studio */}
      <section className="settlement-receipt-card" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "var(--primary-container)" }}>
              edit_note
            </span>
            <span style={{ fontFamily: "var(--font-headline)", fontSize: 14, fontWeight: 700, color: "var(--text-dark)" }}>
              Founder Content Studio
            </span>
          </div>
          <span style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 600 }}>
            1-Click Post to X & Farcaster
          </span>
        </div>

        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>
          Auto-generated social draft based on live queries for: <strong>{selectedInsight.topic}</strong>
        </p>

        <div
          style={{
            background: "var(--bg-card-subtle)",
            border: "1px solid var(--border-card)",
            borderRadius: 12,
            padding: "12px 14px",
            position: "relative",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 13,
              color: "var(--text-dark)",
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
            }}
          >
            {selectedInsight.draftPost}
          </p>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-secondary)" }}>
              <span>Character count: {selectedInsight.draftPost.length}</span>
              <span>•</span>
              <span style={{ color: "var(--primary-pill-text)", fontWeight: 600 }}>Thread Friendly</span>
            </div>

            <button
              type="button"
              onClick={() => handleCopyPost(selectedInsight.id, selectedInsight.draftPost)}
              style={{
                background: copiedId === selectedInsight.id ? "var(--primary-container)" : "var(--inverse-surface)",
                color: copiedId === selectedInsight.id ? "#ffffff" : "var(--inverse-on-surface)",
                border: "none",
                padding: "6px 14px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                transition: "all 0.15s ease",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                {copiedId === selectedInsight.id ? "check" : "content_copy"}
              </span>
              <span>{copiedId === selectedInsight.id ? "Copied!" : "Copy Post"}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Friction Watchdog ("What Is Going Wrong") */}
      <section className="settlement-receipt-card" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "var(--accent-orange)" }}>
              radar
            </span>
            <span style={{ fontFamily: "var(--font-headline)", fontSize: 14, fontWeight: 700, color: "var(--text-dark)" }}>
              Friction Watchdog (What Could Go Wrong)
            </span>
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              background: "var(--primary-pill-bg)",
              color: "var(--primary-pill-text)",
              padding: "2px 6px",
              borderRadius: 4,
            }}
          >
            0 REVERTS RECORDED
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ background: "var(--bg-card-subtle)", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <strong style={{ color: "var(--text-dark)" }}>External Publisher Latency</strong>
              <span style={{ color: "var(--accent-orange)", fontWeight: 700 }}>Avg 310ms (Peak 4.2s)</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
              Academic indices (Semantic Scholar / ArXiv) occasionally delay responses under load. Superhighway cached citations prevent dropped queries.
            </div>
          </div>

          <div style={{ background: "var(--bg-card-subtle)", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <strong style={{ color: "var(--text-dark)" }}>Gas Fee Volatility on Base</strong>
              <span style={{ color: "var(--primary-container)", fontWeight: 700 }}>Mitigated</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
              Base priority fees surge during Ethereum spikes ($0.00065). Qerin dynamically prefers BOT Chain ($0.00008) to preserve profit margins.
            </div>
          </div>

          <div style={{ background: "var(--bg-card-subtle)", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <strong style={{ color: "var(--text-dark)" }}>Spend Cap Utilization</strong>
              <span style={{ color: "var(--primary-container)", fontWeight: 700 }}>10.4% ($0.52 / $5.00)</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
              Daily budget protection active. Automatic circuit breaker will safely halt query spending before any operational loss can occur.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
