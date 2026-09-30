"use client";

import { useState } from "react";
import { DEFAULT_CONFIG } from "../lib/data";
import { ProtocolConfig } from "../lib/types";

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ProtocolConfig;
  onUpdateConfig: (newConfig: ProtocolConfig) => void;
  botChainBlock: number | null;
  baseBlock: number | null;
  rpcLatencyMs: { botChain: number; base: number; backend: number };
  onRefreshNow: () => void;
}

export function ConfigModal({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  botChainBlock,
  baseBlock,
  rpcLatencyMs,
  onRefreshNow,
}: ConfigModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        background: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          maxHeight: "88vh",
          overflowY: "auto",
          background: "var(--bg-card)",
          borderRadius: "24px 24px 0 0",
          border: "1px solid var(--border-card)",
          boxShadow: "0 -8px 30px rgba(0, 0, 0, 0.2)",
          padding: "18px 18px 32px 18px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border-subtle)", margin: "0 auto 4px auto" }} />

        {/* Modal Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "22px", color: "var(--primary-container)" }}
            >
              tune
            </span>
            <div>
              <h3 style={{ fontFamily: "var(--font-headline)", fontSize: 16, fontWeight: 700, color: "var(--text-dark)" }}>
                Protocol Configuration
              </h3>
              <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                Live RPC endpoints, on-chain registry, and spend guards
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "var(--bg-card-subtle)",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Live Network Endpoints */}
        <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Network RPC Endpoints
          </span>

          {/* BOT Chain */}
          <div style={{ background: "var(--bg-card-subtle)", borderRadius: 12, padding: "10px 12px", border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#8b5cf6" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dark)" }}>BOT Chain Mainnet (677)</span>
              </div>
              <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "#10b981", fontWeight: 700 }}>
                {rpcLatencyMs.botChain}ms
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11 }}>
              <code style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)" }}>
                {config.botChainRpc}
              </code>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dark)", fontWeight: 600 }}>
                Block #{botChainBlock ?? "25073894"}
              </span>
            </div>
          </div>

          {/* Base Mainnet */}
          <div style={{ background: "var(--bg-card-subtle)", borderRadius: 12, padding: "10px 12px", border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#0052ff" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dark)" }}>Base Mainnet (8453)</span>
              </div>
              <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "#10b981", fontWeight: 700 }}>
                {rpcLatencyMs.base}ms
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11 }}>
              <code style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)" }}>
                {config.baseRpc}
              </code>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dark)", fontWeight: 600 }}>
                Block #{baseBlock ?? "52002306"}
              </span>
            </div>
          </div>
        </section>

        {/* Contract Registry & Reown Cloud IDs */}
        <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Registry & Reown Cloud
          </span>

          <div style={{ background: "var(--bg-card-subtle)", borderRadius: 12, padding: "10px 12px", border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Registry Contract</span>
              <button
                type="button"
                onClick={() => copyToClipboard(config.registryAddress, "registry")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary-container)", fontSize: 11, fontWeight: 600 }}
              >
                {copiedKey === "registry" ? "Copied!" : "Copy"}
              </button>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-dark)", fontWeight: 600, marginTop: 2 }}>
              {config.registryAddress}
            </div>
          </div>

          <div style={{ background: "var(--bg-card-subtle)", borderRadius: 12, padding: "10px 12px", border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Reown Project ID</span>
              <button
                type="button"
                onClick={() => copyToClipboard(config.reownProjectId, "reown")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary-container)", fontSize: 11, fontWeight: 600 }}
              >
                {copiedKey === "reown" ? "Copied!" : "Copy"}
              </button>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-dark)", fontWeight: 600, marginTop: 2 }}>
              {config.reownProjectId}
            </div>
          </div>
        </section>

        {/* Polling Interval Setting */}
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Auto-Refresh Frequency
          </span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {[10, 15, 30, 60].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => onUpdateConfig({ ...config, refreshIntervalSec: sec })}
                style={{
                  padding: "6px 8px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  border: "1px solid",
                  borderColor: config.refreshIntervalSec === sec ? "var(--primary-container)" : "var(--border-subtle)",
                  background: config.refreshIntervalSec === sec ? "var(--primary-pill-bg)" : "var(--bg-card-subtle)",
                  color: config.refreshIntervalSec === sec ? "var(--primary-pill-text)" : "var(--text-secondary)",
                }}
              >
                {sec}s
              </button>
            ))}
          </div>
        </section>

        {/* Action Button: Ping All RPCs */}
        <button
          type="button"
          onClick={() => {
            onRefreshNow();
            onClose();
          }}
          className="sticky-connect-btn"
          style={{ width: "100%", justifyContent: "center", padding: "10px", marginTop: 4 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
            sync
          </span>
          <span>Refresh All RPCs Now</span>
        </button>
      </div>
    </div>
  );
}
