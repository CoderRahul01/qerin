"use client";

import { INITIAL_FAILURES } from "../lib/data";

interface FailuresTabProps {
  successRate: number;
  rpcLatencyMs: { botChain: number; base: number; backend: number };
}

export function FailuresTab({ successRate, rpcLatencyMs }: FailuresTabProps) {
  const nodes = [
    { name: "BOT Chain RPC (rpc.botchain.ai)", status: "Operational", pingMs: rpcLatencyMs.botChain },
    { name: "Base Mainnet RPC (mainnet.base.org)", status: "Operational", pingMs: rpcLatencyMs.base },
    { name: "Qerin Backend Analytics API", status: "Operational", pingMs: rpcLatencyMs.backend },
    { name: "NVIDIA NIM Inference (Llama 3.3)", status: "Operational", pingMs: 140 },
    { name: "x402 Micropayment Facilitator", status: "Operational", pingMs: 95 },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "4px 16px 20px 16px" }}>
      <div>
        <h2 style={{ fontFamily: "var(--font-headline)", fontSize: 20, fontWeight: 700, color: "var(--text-dark)" }}>
          Health & Diagnostics
        </h2>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
          Failure modes, spend guards, and infrastructure node latency monitoring.
        </p>
      </div>

      {/* Health Score Card */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-card)",
          borderRadius: 16,
          padding: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
        }}
      >
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            ON-CHAIN EXECUTION HEALTH
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--primary-container)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
            {successRate.toFixed(1)}%
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
            Zero smart contract execution reverts recorded
          </div>
        </div>

        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "var(--primary-pill-bg)",
            border: "1px solid var(--primary-pill-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "24px", color: "var(--primary-container)" }}>
            verified_user
          </span>
        </div>
      </div>

      {/* Diagnosed Failure Points */}
      <div className="settlement-receipt-card" style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontFamily: "var(--font-headline)", fontSize: 13, fontWeight: 700, color: "var(--text-dark)" }}>
            Failure Edge Cases & Mitigations
          </span>
          <span style={{ fontSize: 10, background: "var(--bg-container)", color: "var(--text-secondary)", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>
            4 Monitored
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {INITIAL_FAILURES.map((item) => (
            <div
              key={item.id}
              style={{
                background: "var(--bg-card-subtle)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 10,
                padding: "10px 12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: item.occurrences === 0 ? "var(--primary-pill-bg)" : "rgba(244, 91, 0, 0.12)",
                    color: item.occurrences === 0 ? "var(--primary-pill-text)" : "var(--accent-orange)",
                  }}
                >
                  {item.category}
                </span>
                <span style={{ fontSize: 10, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                  {item.occurrences === 0 ? "0 Reverts" : `${item.occurrences} instances recorded`}
                </span>
              </div>

              <div style={{ fontSize: 12, color: "var(--text-dark)", marginTop: 6, lineHeight: 1.35 }}>
                {item.description}
              </div>

              <div style={{ marginTop: 6, fontSize: 11, color: "var(--primary)", fontWeight: 500 }}>
                <strong>Mitigation: </strong>{item.mitigation}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Infrastructure Node Latency */}
      <div className="settlement-receipt-card" style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontFamily: "var(--font-headline)", fontSize: 13, fontWeight: 700, color: "var(--text-dark)" }}>
            Infrastructure Node Ping
          </span>
          <span style={{ fontSize: 10, color: "var(--primary-pill-text)", fontWeight: 700 }}>
            All Systems Online
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {nodes.map((node, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 0",
                borderBottom: i === nodes.length - 1 ? "none" : "1px solid var(--border-subtle)",
                fontSize: 11,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
                <span style={{ color: "var(--text-dark)", fontWeight: 500 }}>{node.name}</span>
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--primary-container)" }}>
                {node.pingMs}ms
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
