"use client";

import { ChainStat } from "../lib/types";

interface ChainsTabProps {
  chains: ChainStat[];
  botChainBlock: number | null;
  baseBlock: number | null;
  rpcLatencyMs: { botChain: number; base: number };
}

export function ChainsTab({
  chains,
  botChainBlock,
  baseBlock,
  rpcLatencyMs,
}: ChainsTabProps) {
  const maxChain = chains.find((c) => c.isMaxChain) || chains[0];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em" }}>Multi-Chain Execution</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
          Live comparative analysis of EVM and SVM settlement rails.
        </p>
      </div>

      {/* Maximum Transactions Chain Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(139, 92, 246, 0.18) 0%, rgba(244, 91, 0, 0.12) 100%)",
          border: "1px solid rgba(139, 92, 246, 0.4)",
          borderRadius: 16,
          padding: 18,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 22 }}>🏆</span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#c084fc", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                MAXIMUM TRANSACTION ACTIVITY
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", marginTop: 2 }}>
                {maxChain.name}
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#c084fc", fontFamily: "var(--font-mono)" }}>
              {maxChain.txSharePct}%
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>of all settlements</div>
          </div>
        </div>

        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", justifyContent: "space-between", fontSize: 12 }}>
          <div>
            <span style={{ color: "var(--text-muted)" }}>Total Txs: </span>
            <strong style={{ color: "var(--text-primary)" }}>{maxChain.totalTransactions}</strong>
          </div>
          <div>
            <span style={{ color: "var(--text-muted)" }}>Avg Gas Fee: </span>
            <strong style={{ color: "#34d399" }}>${maxChain.avgGasCostUsd}</strong>
          </div>
          <div>
            <span style={{ color: "var(--text-muted)" }}>Block Time: </span>
            <strong style={{ color: "var(--text-primary)" }}>{maxChain.avgBlockTimeSec}s</strong>
          </div>
        </div>
      </div>

      {/* Comparative Share Bar */}
      <div className="content-section-card" style={{ marginTop: 0 }}>
        <div className="section-title-row">
          <div className="section-title">
            <span>Transaction Share Breakdown</span>
          </div>
          <span className="section-badge">Live Split</span>
        </div>

        {/* Stacked Bar */}
        <div style={{ height: 12, borderRadius: 6, overflow: "hidden", display: "flex", background: "rgba(255, 255, 255, 0.08)", margin: "14px 0 10px" }}>
          {chains.map((chain) => (
            <div
              key={chain.chainId}
              style={{
                width: `${chain.txSharePct}%`,
                background: chain.color,
                transition: "width 0.6s ease",
              }}
              title={`${chain.name}: ${chain.txSharePct}%`}
            />
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, fontSize: 12 }}>
          {chains.map((chain) => (
            <div key={chain.chainId} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: chain.color }} />
              <span style={{ color: "var(--text-secondary)" }}>{chain.name.split(" ")[0]}:</span>
              <strong style={{ color: "var(--text-primary)" }}>{chain.txSharePct}%</strong>
            </div>
          ))}
        </div>
      </div>

      {/* Deep-Dive Cards per Chain */}
      <div style={{ marginTop: 14 }}>
        {chains.map((chain) => (
          <div key={chain.chainId} className={`chain-row-card ${chain.isMaxChain ? "highlight-max" : ""}`} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="chain-bullet" style={{ background: chain.color, width: 12, height: 12 }} />
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <strong style={{ fontSize: 15, color: "var(--text-primary)" }}>{chain.name}</strong>
                    <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 4, background: "rgba(255, 255, 255, 0.08)", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      ID {chain.chainId}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    Native Currency: {chain.symbol}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                  {chain.totalTransactions}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Total Transactions</div>
              </div>
            </div>

            {/* Performance Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border-subtle)" }}>
              <div style={{ background: "rgba(0, 0, 0, 0.25)", padding: 8, borderRadius: 8 }}>
                <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>Gas Cost</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#34d399", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                  ${chain.avgGasCostUsd}
                </div>
              </div>

              <div style={{ background: "rgba(0, 0, 0, 0.25)", padding: 8, borderRadius: 8 }}>
                <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>Block Time</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                  {chain.avgBlockTimeSec}s
                </div>
              </div>

              <div style={{ background: "rgba(0, 0, 0, 0.25)", padding: 8, borderRadius: 8 }}>
                <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>Live RPC Block</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-orange-bright)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                  {chain.chainId === 677
                    ? botChainBlock ? `#${botChainBlock}` : "Live"
                    : chain.chainId === 8453
                    ? baseBlock ? `#${baseBlock}` : "Live"
                    : "Devnet"}
                </div>
              </div>
            </div>

            {/* Contract & Explorer Link */}
            <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
              <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                Contract: {chain.contractAddress.slice(0, 8)}...{chain.contractAddress.slice(-6)}
              </span>
              <a
                href={`${chain.explorerUrl}/address/${chain.contractAddress}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "var(--accent-orange)",
                  fontWeight: 700,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                Inspect Explorer ↗
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
