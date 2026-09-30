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
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "4px 16px 20px 16px" }}>
      <div>
        <h2 style={{ fontFamily: "var(--font-headline)", fontSize: 20, fontWeight: 700, color: "var(--text-dark)" }}>
          Multi-Chain Markets
        </h2>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
          Live comparative settlement throughput across EVM and SVM rails.
        </p>
      </div>

      {/* Maximum Transactions Chain Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(16, 185, 129, 0.08) 100%)",
          border: "1px solid rgba(139, 92, 246, 0.3)",
          borderRadius: 16,
          padding: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 22 }}>🏆</span>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: "var(--accent-purple)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                MAX TRANSACTION ACTIVITY
              </div>
              <div style={{ fontFamily: "var(--font-headline)", fontSize: 17, fontWeight: 700, color: "var(--text-dark)", marginTop: 2 }}>
                {maxChain.name}
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--accent-purple)", fontFamily: "var(--font-mono)" }}>
              {maxChain.txSharePct}%
            </div>
            <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>of total traffic</div>
          </div>
        </div>

        <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", fontSize: 11 }}>
          <div>
            <span style={{ color: "var(--text-secondary)" }}>Total Txs: </span>
            <strong style={{ color: "var(--text-dark)" }}>{maxChain.totalTransactions}</strong>
          </div>
          <div>
            <span style={{ color: "var(--text-secondary)" }}>Avg Gas: </span>
            <strong style={{ color: "var(--primary-pill-text)" }}>${maxChain.avgGasCostUsd}</strong>
          </div>
          <div>
            <span style={{ color: "var(--text-secondary)" }}>Block Time: </span>
            <strong style={{ color: "var(--text-dark)" }}>{maxChain.avgBlockTimeSec}s</strong>
          </div>
        </div>
      </div>

      {/* Comparative Transaction Share Bar */}
      <div className="settlement-receipt-card" style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontFamily: "var(--font-headline)", fontSize: 13, fontWeight: 700, color: "var(--text-dark)" }}>
            Transaction Share Split
          </span>
          <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--primary-pill-text)", fontWeight: 700 }}>
            Live Split
          </span>
        </div>

        <div style={{ height: 10, borderRadius: 999, overflow: "hidden", display: "flex", background: "var(--bg-container)", margin: "8px 0" }}>
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

        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6, fontSize: 11, marginTop: 4 }}>
          {chains.map((chain) => (
            <div key={chain.chainId} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: chain.color }} />
              <span style={{ color: "var(--text-secondary)" }}>{chain.name.split(" ")[0]}:</span>
              <strong style={{ color: "var(--text-dark)" }}>{chain.txSharePct}%</strong>
            </div>
          ))}
        </div>
      </div>

      {/* Deep-Dive Cards per Chain */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {chains.map((chain) => (
          <div key={chain.chainId} className="settlement-receipt-card" style={{ padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ background: chain.color, width: 10, height: 10, borderRadius: "50%" }} />
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <strong style={{ fontSize: 14, color: "var(--text-dark)" }}>{chain.name}</strong>
                    <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "var(--bg-container)", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                      ID {chain.chainId}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
                    Asset: {chain.symbol} • Latency: {chain.chainId === 677 ? `${rpcLatencyMs.botChain}ms` : `${rpcLatencyMs.base}ms`}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-dark)" }}>
                  {chain.totalTransactions} txs
                </div>
                <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>Volume: ${chain.volumeUsd.toFixed(2)}</div>
              </div>
            </div>

            {/* Performance Mini Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border-subtle)" }}>
              <div style={{ background: "var(--bg-card-subtle)", padding: 6, borderRadius: 6, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>Gas Fee</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--primary-container)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                  ${chain.avgGasCostUsd}
                </div>
              </div>

              <div style={{ background: "var(--bg-card-subtle)", padding: 6, borderRadius: 6, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>Block Time</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dark)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                  {chain.avgBlockTimeSec}s
                </div>
              </div>

              <div style={{ background: "var(--bg-card-subtle)", padding: 6, borderRadius: 6, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>Live Block</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                  {chain.chainId === 677
                    ? botChainBlock ? `#${botChainBlock}` : "Live"
                    : chain.chainId === 8453
                    ? baseBlock ? `#${baseBlock}` : "Live"
                    : "Devnet"}
                </div>
              </div>
            </div>

            {/* Explorer Link */}
            <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
              <span style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: 10 }}>
                {chain.contractAddress.slice(0, 10)}...{chain.contractAddress.slice(-6)}
              </span>
              <a
                href={`${chain.explorerUrl}/address/${chain.contractAddress}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "var(--primary)",
                  fontWeight: 700,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                Explorer ↗
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
