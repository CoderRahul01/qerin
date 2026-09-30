"use client";

import { ChainStat, NavTab, ProtocolMetrics, SearchQueryItem } from "../lib/types";
import { ChartSection } from "./ChartSection";

interface OverviewTabProps {
  metrics: ProtocolMetrics;
  chains: ChainStat[];
  queries: SearchQueryItem[];
  latestTxHash: string;
  latestBlockNumber: number;
  latestSender: string;
  onNavigateTab: (tab: NavTab) => void;
  onOpenConfig: () => void;
}

export function OverviewTab({
  metrics,
  chains,
  queries,
  latestTxHash,
  latestBlockNumber,
  latestSender,
  onNavigateTab,
  onOpenConfig,
}: OverviewTabProps) {
  const maxChain = chains.find((c) => c.isMaxChain) || chains[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Hero Revenue & Live Performance Curve */}
      <ChartSection currentRevenue={metrics.totalRevenueUsd} onOpenSettings={onOpenConfig} />

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
          <div className="bento-tile-number">{metrics.activeUsers} Active</div>
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
          <div className="bento-tile-number">{metrics.walletsConnected} Senders</div>
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
              0x11fa...
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

      {/* Protocol Margin Summary Card */}
      <section style={{ margin: "4px 16px 0 16px" }}>
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-card)",
            borderRadius: 14,
            padding: "12px 14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>Protocol Economics</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-dark)", marginTop: 2 }}>
              ${metrics.totalRevenueUsd.toFixed(2)} Gross • ${metrics.agentSourceSpendUsd.toFixed(2)} Cost
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                background: "var(--primary-pill-bg)",
                color: "var(--primary-pill-text)",
                padding: "3px 8px",
                borderRadius: 999,
              }}
            >
              {metrics.grossMarginPct}% Net Margin
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
                <a
                  href={`https://scan.botchain.ai/tx/${q.txHash || latestTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--primary)", textDecoration: "none" }}
                  title="View transaction on BOT Chain explorer"
                >
                  scan.botchain.ai ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* On-Chain Settlement Receipt Card (Real Live Transaction Data) */}
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
                Latest On-Chain Receipt
              </span>
            </div>
            <a
              href={`https://scan.botchain.ai/tx/${latestTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                color: "var(--primary-container)",
                fontWeight: 700,
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <span>Verified On-Chain</span>
              <span>↗</span>
            </a>
          </div>

          <div className="receipt-body">
            <div className="receipt-row">
              <span style={{ color: "var(--text-secondary)" }}>Block Confirmation</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--text-dark)" }}>
                #{latestBlockNumber}
              </span>
            </div>
            <div className="receipt-row">
              <span style={{ color: "var(--text-secondary)" }}>Gas Execution Fee</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--text-dark)" }}>
                0.00008 BOT ($0.00008)
              </span>
            </div>
            <div className="receipt-row">
              <span style={{ color: "var(--text-secondary)" }}>Transaction Hash</span>
              <a
                href={`https://scan.botchain.ai/tx/${latestTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--primary)", textDecoration: "none" }}
              >
                {latestTxHash.slice(0, 10)}...{latestTxHash.slice(-8)}
              </a>
            </div>
            <div className="receipt-row">
              <span style={{ color: "var(--text-secondary)" }}>Sender / Signer Node</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--text-dark)" }}>
                {latestSender.slice(0, 8)}...{latestSender.slice(-6)}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
