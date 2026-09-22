"use client";

import React, { useState } from "react";
import Link from "next/link";
import { LogoMark } from "./LogoMark";

const BOT_CHAIN_ID = 677;
const BOT_REGISTRY_ADDRESS =
  process.env.NEXT_PUBLIC_BOTCHAIN_REGISTRY_ADDRESS ||
  "0xb35788922a5b9C8938dE8AEDf725b88D26eEEa45";
// This is the BOT Chain registry deployment transaction, not a fabricated
// "latest receipt". Per-query receipt links are shown only after the backend
// has an actual transaction hash to return.
const BOT_DEPLOYMENT_TRANSACTION =
  "0xddf75e5bfea642d2dc6b800b3e479d8a79ec048cbcd3857063fc320a8d84a1aa";
const BOT_WEBSITE_URL = "https://botchain.ai";
const BOT_EXPLORER_URL = "https://scan.botchain.ai";
const DUNE_HUB_URL =
  "https://dune.com/qerin26/qerin-protocol-autonomous-ai-agent-analytics-bot-chain-hub";

function truncateHash(hash: string, startChars = 14, endChars = 12): string {
  if (!hash || hash.length <= startChars + endChars) return hash;
  return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
}

export function BotChainProofFooter() {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  return (
    <footer
      style={{
        marginTop: "clamp(36px, 6vw, 64px)",
        paddingTop: "clamp(28px, 4vw, 44px)",
        paddingBottom: "clamp(32px, 5vw, 56px)",
        borderTop: "1px solid var(--qerin-border)",
        color: "var(--qerin-text)",
        fontFamily: "var(--font-inter), sans-serif",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "clamp(24px, 4vw, 48px)",
          alignItems: "start",
          marginBottom: 32,
        }}
      >
        {/* Left Column: Brand & Ecosystem Details */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <LogoMark size={24} />
            <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em" }}>
              Qerin Protocol
            </span>
          </div>

          <p
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: "var(--qerin-text-muted)",
              maxWidth: 420,
              margin: 0,
              marginBottom: 20,
            }}
          >
            Autonomous AI intelligence engine with verifiable x402 HTTP micropayments.
            Delivering pay-per-query research backed by cryptographic on-chain delivery proofs.
          </p>

          {/* BOT Chain Ecosystem Validation Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 14px",
              borderRadius: 10,
              background: "rgba(139, 92, 246, 0.08)",
              border: "1px solid rgba(139, 92, 246, 0.25)",
              marginBottom: 22,
            }}
          >
            {/* BOT Chain Hexagon-style Icon */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ flexShrink: 0 }}
            >
              <path
                d="M12 2L21 7.2V16.8L12 22L3 16.8V7.2L12 2Z"
                stroke="#8B5CF6"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="12" r="3.5" fill="#8B5CF6" />
            </svg>
            <div style={{ fontSize: 12.5, lineHeight: 1.3 }}>
              <span style={{ fontWeight: 600, color: "var(--qerin-text)" }}>
                Officially Launched on{" "}
              </span>
              <span style={{ fontWeight: 700, color: "#8B5CF6" }}>
                BOT Chain Mainnet (L1)
              </span>
            </div>
          </div>

          {/* Ecosystem & Partner Links */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px 18px",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <Link
              href="/app"
              style={{ color: "var(--qerin-accent)", textDecoration: "none" }}
            >
              Launch App →
            </Link>
            <Link
              href="/developers"
              style={{ color: "var(--qerin-text-muted)", textDecoration: "none" }}
            >
              Developers
            </Link>
            <a
              href={BOT_WEBSITE_URL}
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--qerin-text-muted)", textDecoration: "none" }}
            >
              BOT Chain Website ↗
            </a>
            <a
              href={BOT_EXPLORER_URL}
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--qerin-text-muted)", textDecoration: "none" }}
            >
              BOTScan Explorer ↗
            </a>
            <a
              href={DUNE_HUB_URL}
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--qerin-text-muted)", textDecoration: "none" }}
            >
              Dune Analytics ↗
            </a>
            <a
              href="https://x.com/Qerin_AI"
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--qerin-text-muted)", textDecoration: "none" }}
            >
              Twitter (X) ↗
            </a>
          </div>
        </div>

        {/* Right Column: "PROOF ON BOT MAINNET" Terminal Card */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              background: "#080a0d",
              borderRadius: 14,
              border: "1px solid rgba(0, 229, 163, 0.25)",
              boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.5), 0 0 20px -5px rgba(0, 229, 163, 0.12)",
              padding: "22px 24px",
              fontFamily: "var(--font-ibm-plex-mono), ui-monospace, Menlo, monospace",
              color: "#e2e8f0",
              boxSizing: "border-box",
            }}
          >
            {/* Header with Pulsing Green Indicator */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
                paddingBottom: 12,
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    position: "relative",
                    display: "flex",
                    width: 8,
                    height: 8,
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      backgroundColor: "#00e5a3",
                      opacity: 0.75,
                      animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
                    }}
                  />
                  <span
                    style={{
                      position: "relative",
                      borderRadius: "50%",
                      width: 8,
                      height: 8,
                      backgroundColor: "#00e5a3",
                    }}
                  />
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: "#ffffff",
                  }}
                >
                  PROOF ON BOT MAINNET
                </span>
              </div>

              <span
                style={{
                  fontSize: 10.5,
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: "rgba(0, 229, 163, 0.12)",
                  color: "#00e5a3",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  border: "1px solid rgba(0, 229, 163, 0.3)",
                }}
              >
                LIVE L1
              </span>
            </div>

            {/* Metrics List */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                fontSize: 12,
              }}
            >
              {/* Chain ID */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "150px 1fr",
                  alignItems: "center",
                }}
              >
                <span style={{ color: "#94a3b8", letterSpacing: "0.05em", fontWeight: 600 }}>
                  CHAIN ID
                </span>
                <span
                  style={{
                    color: "#00e5a3",
                    fontWeight: 700,
                    fontFamily: "var(--font-ibm-plex-mono), monospace",
                  }}
                >
                  {BOT_CHAIN_ID}
                </span>
              </div>

              {/* Registry Address */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "150px 1fr",
                  alignItems: "center",
                }}
              >
                <span style={{ color: "#94a3b8", letterSpacing: "0.05em", fontWeight: 600 }}>
                  REGISTRY ADDRESS
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <a
                    href={`${BOT_EXPLORER_URL}/address/${BOT_REGISTRY_ADDRESS}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: "#00e5a3",
                      textDecoration: "none",
                      fontFamily: "var(--font-ibm-plex-mono), monospace",
                      wordBreak: "break-all",
                    }}
                    title={`View ${BOT_REGISTRY_ADDRESS} on BOTScan`}
                  >
                    {truncateHash(BOT_REGISTRY_ADDRESS, 14, 12)}
                  </a>
                  <button
                    onClick={() => copyToClipboard(BOT_REGISTRY_ADDRESS, "address")}
                    type="button"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: copiedField === "address" ? "#00e5a3" : "#64748b",
                      cursor: "pointer",
                      padding: 2,
                      display: "flex",
                      alignItems: "center",
                    }}
                    title="Copy full address"
                  >
                    {copiedField === "address" ? (
                      <span style={{ fontSize: 10, color: "#00e5a3" }}>✓</span>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Deployment transaction */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "150px 1fr",
                  alignItems: "center",
                }}
              >
                <span style={{ color: "#94a3b8", letterSpacing: "0.05em", fontWeight: 600 }}>
                  DEPLOYMENT TX
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <a
                    href={`${BOT_EXPLORER_URL}/tx/${BOT_DEPLOYMENT_TRANSACTION}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: "#00e5a3",
                      textDecoration: "none",
                      fontFamily: "var(--font-ibm-plex-mono), monospace",
                      wordBreak: "break-all",
                    }}
                    title={`View deployment tx ${BOT_DEPLOYMENT_TRANSACTION} on BOTScan`}
                  >
                    {truncateHash(BOT_DEPLOYMENT_TRANSACTION, 14, 12)}
                  </a>
                  <button
                    onClick={() => copyToClipboard(BOT_DEPLOYMENT_TRANSACTION, "deployment")}
                    type="button"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: copiedField === "deployment" ? "#00e5a3" : "#64748b",
                      cursor: "pointer",
                      padding: 2,
                      display: "flex",
                      alignItems: "center",
                    }}
                    title="Copy deployment transaction hash"
                  >
                    {copiedField === "deployment" ? (
                      <span style={{ fontSize: 10, color: "#00e5a3" }}>✓</span>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom BOTScan Action Link */}
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <a
                href={`${BOT_EXPLORER_URL}/address/${BOT_REGISTRY_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "#00e5a3",
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  transition: "opacity 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                View registry on BOTScan ↗
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Legal & Protocol Strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          paddingTop: 20,
          borderTop: "1px solid var(--qerin-border)",
          fontSize: 12,
          color: "var(--qerin-text-muted)",
        }}
      >
        <div>
          © {new Date().getFullYear()} Qerin Protocol. Verifiable Autonomous AI Settlement.
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <span>Chain ID 677 (BOT Chain) & 8453 (Base)</span>
          <span>•</span>
          <a
            href="https://x.com/Qerin_AI"
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--qerin-text-muted)", textDecoration: "none" }}
          >
            @Qerin_AI
          </a>
        </div>
      </div>
    </footer>
  );
}
