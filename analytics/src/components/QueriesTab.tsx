"use client";

import { useMemo, useState } from "react";
import { SearchQueryItem } from "../lib/types";

interface QueriesTabProps {
  queries: SearchQueryItem[];
}

export function QueriesTab({ queries }: QueriesTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = ["All", "AI & Infra", "DeFi", "Cross-Chain", "Micropayments", "EVM Gas"];

  const filteredQueries = useMemo(() => {
    return queries.filter((q) => {
      const matchesSearch =
        q.query.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.userAddress.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "All" || q.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [queries, searchTerm, selectedCategory]);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em" }}>Live Search Queries</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
          Verifiable research inquiries executed by users with on-chain micropayment settlement.
        </p>
      </div>

      {/* Search Input */}
      <div style={{ position: "relative", marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Filter queries, topics, or addresses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%",
            background: "var(--bg-card)",
            border: "1px solid var(--border-medium)",
            borderRadius: 12,
            padding: "10px 14px 10px 36px",
            color: "var(--text-primary)",
            fontSize: 13,
            outline: "none",
          }}
        />
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-muted)"
          strokeWidth="2"
          style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>

      {/* Category Pills */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: "5px 12px",
              borderRadius: 20,
              fontSize: 11.5,
              fontWeight: 700,
              border: "1px solid",
              borderColor: selectedCategory === cat ? "var(--accent-orange)" : "var(--border-subtle)",
              background: selectedCategory === cat ? "rgba(244, 91, 0, 0.15)" : "var(--bg-card)",
              color: selectedCategory === cat ? "var(--accent-orange-bright)" : "var(--text-muted)",
              whiteSpace: "nowrap",
              cursor: "pointer",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Queries List */}
      <div style={{ marginTop: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>
            Showing {filteredQueries.length} of {queries.length} queries
          </span>
          <span style={{ fontSize: 11, color: "#34d399", fontWeight: 700 }}>
            100% Successful Listings
          </span>
        </div>

        {filteredQueries.map((q) => (
          <div key={q.id} className="query-item-card">
            <div className="query-top-tags">
              <span className="query-topic-pill">{q.topic}</span>
              <span className="query-time">{q.timestamp}</span>
            </div>

            <div className="query-text">{q.query}</div>

            {/* Sources Citations */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 4 }}>
              {q.sources.map((src, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 10.5,
                    padding: "2px 7px",
                    borderRadius: 4,
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  📰 {src}
                </span>
              ))}
            </div>

            <div className="query-bottom-row">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="settlement-badge">✓ {q.settlementStatus}</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {q.latencyMs}ms
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    padding: "2px 6px",
                    borderRadius: 4,
                    fontSize: 10.5,
                    fontWeight: 700,
                    background:
                      q.chain === "BOT Chain"
                        ? "rgba(139, 92, 246, 0.15)"
                        : q.chain === "Base"
                        ? "rgba(0, 82, 255, 0.15)"
                        : "rgba(20, 241, 149, 0.15)",
                    color:
                      q.chain === "BOT Chain"
                        ? "#c084fc"
                        : q.chain === "Base"
                        ? "#60a5fa"
                        : "#2dd4bf",
                  }}
                >
                  {q.chain}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-primary)" }}>
                  ${q.amountUsd.toFixed(3)}
                </span>
              </div>
            </div>

            {q.txHash && (
              <div style={{ marginTop: 4, paddingTop: 6, borderTop: "1px dashed var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
                <span style={{ color: "var(--text-muted)" }}>On-chain TX:</span>
                <a
                  href={
                    q.chain === "BOT Chain"
                      ? `https://scan.botchain.ai/tx/${q.txHash}`
                      : `https://basescan.org/tx/${q.txHash}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "var(--accent-orange)", fontFamily: "var(--font-mono)", textDecoration: "none" }}
                >
                  {q.txHash.slice(0, 10)}...{q.txHash.slice(-6)} ↗
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
