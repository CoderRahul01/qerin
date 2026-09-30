"use client";

import { ChainStat, NavTab, ProtocolMetrics, SearchQueryItem } from "../lib/types";
import { ChartSection } from "./ChartSection";

interface OverviewTabProps {
  metrics: ProtocolMetrics;
  chains: ChainStat[];
  queries: SearchQueryItem[];
  onNavigateTab: (tab: NavTab) => void;
}

export function OverviewTab({
  metrics,
  chains,
  queries,
  onNavigateTab,
}: OverviewTabProps) {
  const maxChain = chains.find((c) => c.isMaxChain) || chains[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Hero Revenue & Live Performance Curve */}
      <ChartSection currentRevenue={metrics.totalRevenueUsd} />

      {/* 2x2 Bento Key Metrics Grid (Stitch Generated) */}
      <section className="bento-grid-2x2">
        {/* Card 1: Active Users */}
        <div
          className="bento-metric-tile"
          onClick={() => onNavigateTab("wallets")}
          title="View connected user accounts & Reown Cloud ID"
        >
          <div className="bento-tile-header">
            <span className="bento-tile-label">Active Users</span>
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              group
            </span>
          </div>
          <div className="bento-tile-number">12 Active</div>
          <div className="bento-tile-footer">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "13px", color: "var(--primary-container)" }}
            >
              cloud_done
            </span>
            <span
              style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-secondary)" }}
              title="Reown Project ID: beccbc473190c8b06eb5471223604fdf"
            >
              beccbc473190...
            </span>
          </div>
        </div>

        {/* Card 2: Wallets Connected */}
        <div
          className="bento-metric-tile"
          onClick={() => onNavigateTab("wallets")}
          title="View on-chain sender wallet addresses"
        >
          <div className="bento-tile-header">
            <span className="bento-tile-label">Wallets Connected</span>
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              account_balance_wallet
            </span>
          </div>
          <div className="bento-tile-number">3 Senders</div>
          <div className="bento-tile-footer" style={{ gap: "4px", flexWrap: "wrap" }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                padding: "1px 4px",
                background: "var(--bg-card-subtle)",
                borderRadius: "4px",
              }}
            >
              0x5b21...
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                padding: "1px 4px",
                background: "var(--bg-card-subtle)",
                borderRadius: "4px",
              }}
            >
              0x5ad2...
            </span>
          </div>
        </div>

        {/* Card 3: Total Queries */}
        <div
          className="bento-metric-tile"
          onClick={() => onNavigateTab("queries")}
          title="Browse all research queries"
        >
          <div className="bento-tile-header">
            <span className="bento-tile-label">Total Queries</span>
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              database
            </span>
          </div>
          <div className="bento-tile-number">{metrics.totalQueries} Executed</div>
          <div className="bento-tile-footer">
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--primary-container)",
              }}
            />
            <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--primary-pill-text)" }}>
              100% Throughput
            </span>
          </div>
        </div>

        {/* Card 4: Deliveries */}
        <div
          className="bento-metric-tile"
          onClick={() => onNavigateTab("failures")}
          title="View delivery verification & health logs"
        >
          <div className="bento-tile-header">
            <span className="bento-tile-label">Deliveries</span>
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              verified
            </span>
          </div>
          <div className="bento-tile-number">{metrics.successfulListings} Verified</div>
          <div className="bento-tile-footer">
            <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--primary)" }}>
              100% Success, 0 Reverts
            </span>
          </div>
        </div>
      </section>

      {/* Multi-Chain Distribution (Stitch Component Blueprint) */}
      <section className="card-module">
        <div className="card-module-header">
          <div className="card-module-title">
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              alt_route
            </span>
            <span>Multi-Chain Distribution</span>
          </div>
          <span
            style={{
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              padding: "2px 6px",
              borderRadius: "4px",
              background: "var(--bg-container)",
              color: "var(--text-secondary)",
            }}
          >
            Routes (n={metrics.totalQueries})
          </span>
        </div>

        {/* Segmented Distribution Bar */}
        <div className="segmented-progress-bar">
          <div
            style={{
              width: "59.1%",
              background: "var(--inverse-surface)",
              height: "100%",
            }}
            title="BOT Chain 59.1%"
          />
          <div
            style={{
              width: "36.4%",
              background: "var(--primary-container)",
              height: "100%",
            }}
            title="Base Mainnet 36.4%"
          />
          <div
            style={{
              width: "4.5%",
              background: "var(--secondary)",
              height: "100%",
            }}
            title="Solana Devnet 4.5%"
          />
        </div>

        {/* Chain Breakdown Rows */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {chains.map((chain) => (
            <div key={chain.name} className="chain-item-row">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: chain.isMaxChain ? "var(--inverse-surface)" : chain.color,
                  }}
                />
                <span style={{ fontWeight: 600, color: "var(--text-dark)" }}>{chain.name}</span>
                {chain.isMaxChain && (
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: 800,
                      padding: "1px 5px",
                      borderRadius: "4px",
                      background: "var(--primary-pill-bg)",
                      color: "var(--primary-pill-text)",
                    }}
                  >
                    LEADER
                  </span>
                )}
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-dark)" }}>
                {chain.txSharePct}%
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Live Query Settlements Feed (Stitch Micro-cards) */}
      <section style={{ margin: "10px 16px 0 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <h2 style={{ fontFamily: "var(--font-headline)", fontSize: "14px", fontWeight: 700, color: "var(--text-dark)" }}>
              Live Query Settlements
            </h2>
            <span className="live-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--primary-container)" }} />
          </div>
          <button
            type="button"
            style={{
              background: "none",
              border: "none",
              color: "var(--primary)",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
            onClick={() => onNavigateTab("queries")}
          >
            View All
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {queries.slice(0, 3).map((q) => (
            <div key={q.id} className="query-item-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                <h3 className="query-item-title">{q.topic}</h3>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "var(--primary-pill-text)",
                    background: "var(--primary-pill-bg)",
                    padding: "2px 7px",
                    borderRadius: "999px",
                    flexShrink: 0,
                  }}
                >
                  ${q.amountUsd.toFixed(2)} USD
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span className="query-item-tag">{q.category}</span>
                  <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                    {q.sources[0]}
                  </span>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-muted)" }}>
                  x402 proto
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* On-Chain Settlement Receipt Card (Stitch & Public.com Order-Completed Style) */}
      <section style={{ margin: "10px 16px 0 16px" }}>
        <div className="settlement-receipt-card">
          <div className="receipt-header">
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "18px", color: "var(--primary-container)", fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
              <span style={{ fontFamily: "var(--font-headline)", fontSize: "13px", fontWeight: 700, color: "var(--text-dark)" }}>
                On-Chain Settlement Receipt
              </span>
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--primary-container)", fontWeight: 700 }}>
              Verified
            </span>
          </div>

          <div className="receipt-body">
            <div className="receipt-row">
              <span style={{ color: "var(--text-secondary)" }}>Block Confirmation</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--text-dark)" }}>
                #23949102
              </span>
            </div>
            <div className="receipt-row">
              <span style={{ color: "var(--text-secondary)" }}>Gas Execution Fee</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--text-dark)" }}>
                0.00014 ETH ($0.38)
              </span>
            </div>
            <div className="receipt-row">
              <span style={{ color: "var(--text-secondary)" }}>Delivery Hash</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--primary)" }}>
                0x8a9f...c24d
              </span>
            </div>
            <div className="receipt-row">
              <span style={{ color: "var(--text-secondary)" }}>Recipient Node</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--text-dark)" }}>
                0x5b21...93ae
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
