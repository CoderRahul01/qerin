"use client";

import { useMemo, useState } from "react";
import { SearchQueryItem } from "../lib/types";

interface QueriesTabProps {
  queries: SearchQueryItem[];
}

export function QueriesTab({ queries }: QueriesTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = ["All", "AI & Infra", "DeFi", "Cross-Chain", "EVM Gas"];

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
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "4px 16px 20px 16px" }}>
      <div>
        <h2 style={{ fontFamily: "var(--font-headline)", fontSize: 20, fontWeight: 700, color: "var(--text-dark)" }}>
          Research Queries
        </h2>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
          Observed live queries with publisher citations and x402 micropayment proofs.
        </p>
      </div>

      {/* Public.com Style Search Pill Input */}
      <div style={{ position: "relative" }}>
        <input
          type="text"
          placeholder="Search topics, publishers, or addresses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%",
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
            borderRadius: 999,
            padding: "9px 14px 9px 36px",
            color: "var(--text-dark)",
            fontSize: 12,
            outline: "none",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
          }}
        />
        <span
          className="material-symbols-outlined"
          style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: "16px", color: "var(--text-secondary)" }}
        >
          search
        </span>
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm("")}
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`timeframe-pill-btn ${selectedCategory === cat ? "active" : ""}`}
            style={{
              background: selectedCategory === cat ? "var(--inverse-surface)" : "var(--bg-card)",
              color: selectedCategory === cat ? "var(--inverse-on-surface)" : "var(--text-secondary)",
              border: "1px solid var(--border-subtle)",
              padding: "4px 10px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Query Count Summary */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
        <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
          Showing {filteredQueries.length} of {queries.length} queries
        </span>
        <span style={{ color: "var(--primary-pill-text)", fontWeight: 700 }}>
          100% Verified Deliveries
        </span>
      </div>

      {/* Queries List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filteredQueries.map((q) => (
          <div key={q.id} className="query-item-card" style={{ marginBottom: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div>
                <h3 className="query-item-title">{q.topic}</h3>
                <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.3 }}>
                  &ldquo;{q.query}&rdquo;
                </p>
              </div>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--primary-pill-text)",
                  background: "var(--primary-pill-bg)",
                  padding: "2px 7px",
                  borderRadius: 999,
                  flexShrink: 0,
                }}
              >
                ${q.amountUsd.toFixed(2)} USD
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 6, borderTop: "1px solid var(--border-subtle)", fontSize: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="query-item-tag">{q.category}</span>
                <span style={{ color: "var(--text-secondary)" }}>
                  {q.sources.join(" • ")}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "var(--text-secondary)" }}>{q.timestamp}</span>
                {q.txHash && (
                  <a
                    href={`https://scan.botchain.ai/tx/${q.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "var(--primary)", fontWeight: 700, textDecoration: "none" }}
                    title="View on explorer"
                  >
                    Explorer ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
