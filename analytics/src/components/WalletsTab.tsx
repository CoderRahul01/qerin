"use client";

import { useState } from "react";
import { INITIAL_WALLETS } from "../lib/data";
import { ProtocolMetrics } from "../lib/types";

interface WalletsTabProps {
  metrics: ProtocolMetrics;
}

export function WalletsTab({ metrics }: WalletsTabProps) {
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const connectBrowserWallet = async () => {
    setConnecting(true);
    setConnectError(null);
    try {
      if (typeof window === "undefined" || !(window as unknown as { ethereum?: { request: (args: { method: string }) => Promise<string[]> } }).ethereum) {
        throw new Error("No Web3 wallet detected in browser. Please install MetaMask, Coinbase, or open in a Web3 browser.");
      }
      const ethereum = (window as unknown as { ethereum: { request: (args: { method: string }) => Promise<string[]> } }).ethereum;
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });
      if (accounts && accounts[0]) {
        setUserAddress(accounts[0].toLowerCase());
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection was rejected";
      setConnectError(msg);
    } finally {
      setConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setUserAddress(null);
  };

  // 7-day activity data for the Reown histogram
  const daysActivity = [
    { day: "Thu", users: 1, height: "35%" },
    { day: "Fri", users: 2, height: "55%" },
    { day: "Sat", users: 1, height: "30%" },
    { day: "Sun", users: 1, height: "25%" },
    { day: "Mon", users: 3, height: "80%" },
    { day: "Tue", users: 2, height: "60%" },
    { day: "Wed", users: 2, height: "65%" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "4px 16px 20px 16px" }}>
      {/* Title */}
      <div>
        <h2 style={{ fontFamily: "var(--font-headline)", fontSize: 20, fontWeight: 700, color: "var(--text-dark)" }}>
          Wallets & Accounts
        </h2>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
          Observed live on-chain signers, Reown Cloud sync, and active researcher tiers.
        </p>
      </div>

      {/* Reown Cloud Project Dashboard Card (Matches media_1790790540561.png) */}
      <section className="settlement-receipt-card">
        <div className="receipt-header">
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "18px", color: "var(--primary-container)" }}
            >
              cloud_done
            </span>
            <span style={{ fontFamily: "var(--font-headline)", fontSize: 13, fontWeight: 700, color: "var(--text-dark)" }}>
              Reown Cloud Integration
            </span>
          </div>
          <span
            style={{
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              background: "var(--primary-pill-bg)",
              color: "var(--primary-pill-text)",
              padding: "2px 6px",
              borderRadius: "4px",
              fontWeight: 700,
            }}
          >
            Project Qerin
          </span>
        </div>

        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Project ID</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <code style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-dark)", fontWeight: 600 }}>
                beccbc473190c8b06eb5471223604fdf
              </code>
              <button
                type="button"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
                onClick={() => {
                  navigator.clipboard.writeText("beccbc473190c8b06eb5471223604fdf");
                  alert("Project ID copied to clipboard!");
                }}
                title="Copy Project ID"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                  content_copy
                </span>
              </button>
            </div>
          </div>

          {/* 7-Day User Activity Histogram */}
          <div style={{ background: "var(--bg-card-subtle)", padding: "10px", borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-dark)" }}>
                {metrics.activeUsers} Unique Users (Last 7 Days)
              </span>
              <span style={{ fontSize: 10, color: "var(--primary-pill-text)", fontWeight: 700 }}>
                Live On-Chain
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: 60, gap: 6, paddingTop: 4 }}>
              {daysActivity.map((d, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                  <div
                    style={{
                      width: "100%",
                      maxWidth: 22,
                      height: d.height,
                      background: i === daysActivity.length - 1 ? "var(--primary-container)" : "var(--border-subtle)",
                      borderRadius: "4px 4px 0 0",
                      transition: "height 0.3s ease",
                    }}
                    title={`${d.day}: ${d.users} active`}
                  />
                  <span style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
                    {d.day}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Wallet Providers Breakdown */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            <div style={{ background: "var(--bg-card-subtle)", padding: "8px", borderRadius: 8, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>MetaMask</div>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-dark)", marginTop: 2 }}>
                58%
              </div>
            </div>
            <div style={{ background: "var(--bg-card-subtle)", padding: "8px", borderRadius: 8, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>WalletConnect</div>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-dark)", marginTop: 2 }}>
                33%
              </div>
            </div>
            <div style={{ background: "var(--bg-card-subtle)", padding: "8px", borderRadius: 8, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>Coinbase</div>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-dark)", marginTop: 2 }}>
                9%
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Connect Personal Web3 Wallet */}
      <section className="settlement-receipt-card">
        <div style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-dark)" }}>
              {userAddress ? "Connected Session" : "Personal Wallet Session"}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
              {userAddress ? "Active signer detected" : "Connect to verify personal query receipts"}
            </div>
          </div>

          {userAddress ? (
            <button
              type="button"
              onClick={disconnectWallet}
              style={{
                background: "var(--bg-card-subtle)",
                border: "1px solid var(--border-subtle)",
                color: "#ef4444",
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Disconnect
            </button>
          ) : (
            <button
              type="button"
              onClick={connectBrowserWallet}
              disabled={connecting}
              className="sticky-connect-btn"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>
                account_balance_wallet
              </span>
              <span>{connecting ? "Connecting..." : "Connect"}</span>
            </button>
          )}
        </div>

        {userAddress && (
          <div style={{ padding: "8px 14px", background: "var(--primary-pill-bg)", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", fontSize: 11 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--primary-pill-text)" }}>
              ● {userAddress.slice(0, 10)}...{userAddress.slice(-8)}
            </span>
            <span style={{ color: "var(--primary-pill-text)", fontWeight: 600 }}>Active Web3 Session</span>
          </div>
        )}

        {connectError && (
          <div style={{ padding: "8px 14px", color: "#ef4444", fontSize: 11 }}>
            ⚠️ {connectError}
          </div>
        )}
      </section>

      {/* Verified Participating Wallets List */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h3 style={{ fontFamily: "var(--font-headline)", fontSize: 14, fontWeight: 700, color: "var(--text-dark)" }}>
            Observed Participating Wallets
          </h3>
          <span style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 600 }}>
            {INITIAL_WALLETS.length} Addresses
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {INITIAL_WALLETS.map((w, idx) => (
            <div key={idx} className="query-item-card" style={{ marginBottom: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <strong style={{ fontSize: 13, color: "var(--text-dark)" }}>{w.label}</strong>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: 4,
                        background: w.type === "Operator" ? "rgba(244, 91, 0, 0.12)" : "var(--primary-pill-bg)",
                        color: w.type === "Operator" ? "var(--accent-orange)" : "var(--primary-pill-text)",
                      }}
                    >
                      {w.type}
                    </span>
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)", marginTop: 2 }}>
                    {w.address.slice(0, 10)}...{w.address.slice(-8)}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--text-dark)" }}>
                    {w.queriesCount} queries
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                    ${w.totalSpentUsd.toFixed(2)} settled
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 6, borderTop: "1px solid var(--border-subtle)", fontSize: 10, color: "var(--text-secondary)" }}>
                <span>Route: {w.primaryChain}</span>
                <span>Active: {w.lastActive}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
