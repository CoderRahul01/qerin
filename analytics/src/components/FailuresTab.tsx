"use client";

import { INITIAL_FAILURES } from "../lib/data";

interface FailuresTabProps {
  successRate: number;
  rpcLatencyMs: { botChain: number; base: number };
}

export function FailuresTab({ successRate, rpcLatencyMs }: FailuresTabProps) {
  const nodes = [
    { name: "BOT Chain RPC (rpc.botchain.ai)", status: "Operational", pingMs: rpcLatencyMs.botChain },
    { name: "Base Mainnet RPC (mainnet.base.org)", status: "Operational", pingMs: rpcLatencyMs.base },
    { name: "Cloudflare Workers Engine", status: "Operational", pingMs: 45 },
    { name: "NVIDIA NIM Synthesis (Llama 3.3)", status: "Operational", pingMs: 180 },
    { name: "x402 Micropayment Facilitator", status: "Operational", pingMs: 95 },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em" }}>Failure & Health Diagnostics</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
          Complete visibility into edge failure cases, spend guard stops, and node health.
        </p>
      </div>

      {/* Health Score Card */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
            PROTOCOL DELIVERY HEALTH
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#34d399", fontFamily: "var(--font-mono)", marginTop: 2 }}>
            {successRate}%
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
            Zero smart contract execution reverts
          </div>
        </div>

        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(16, 185, 129, 0.15)", border: "2px solid #10b981", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
          🛡️
        </div>
      </div>

      {/* Failure Points Inspector */}
      <div className="content-section-card" style={{ marginTop: 0 }}>
        <div className="section-title-row">
          <div className="section-title">
            <span>Diagnosed Failure Points</span>
          </div>
          <span className="section-badge" style={{ color: "#f87171", background: "rgba(239, 68, 68, 0.12)" }}>
            4 Categories Identified
          </span>
        </div>

        {INITIAL_FAILURES.map((item) => (
          <div key={item.id} className="failure-item-card">
            <div className="failure-header">
              <span className="failure-category-tag">{item.category}</span>
              <span className="failure-count-badge">
                {item.occurrences} instances recorded
              </span>
            </div>

            <div className="failure-desc">{item.description}</div>

            <div className="failure-mitigation-box">
              <strong style={{ color: "var(--accent-orange-bright)" }}>Active Mitigation: </strong>
              {item.mitigation}
            </div>
          </div>
        ))}
      </div>

      {/* Node Health Status */}
      <div className="content-section-card">
        <div className="section-title-row">
          <div className="section-title">
            <span>Infrastructure Node Status</span>
          </div>
          <span className="section-badge" style={{ color: "#34d399", background: "rgba(16, 185, 129, 0.12)" }}>
            All Systems Online
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
          {nodes.map((node, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                background: "var(--bg-card-subtle)",
                borderRadius: 10,
                border: "1px solid var(--border-subtle)",
                fontSize: 12.5,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
                <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{node.name}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontSize: 11 }}>
                  {node.pingMs}ms
                </span>
                <span style={{ color: "#34d399", fontWeight: 700, fontSize: 11 }}>
                  {node.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
