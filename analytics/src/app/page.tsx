"use client";

import { useCallback, useEffect, useState } from "react";
import { BottomNav } from "../components/BottomNav";
import { ChainsTab } from "../components/ChainsTab";
import { FailuresTab } from "../components/FailuresTab";
import { Header } from "../components/Header";
import { OverviewTab } from "../components/OverviewTab";
import { QueriesTab } from "../components/QueriesTab";
import { WalletsTab } from "../components/WalletsTab";
import { INITIAL_CHAINS, INITIAL_METRICS, INITIAL_QUERIES } from "../lib/data";
import { fetchLiveProtocolData, LiveSyncState } from "../lib/liveSync";
import { NavTab } from "../lib/types";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function AnalyticsDashboardPage() {
  const [activeTab, setActiveTab] = useState<NavTab>("overview");
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [liveState, setLiveState] = useState<LiveSyncState>({
    metrics: INITIAL_METRICS,
    chains: INITIAL_CHAINS,
    lastSyncedAt: "Live",
    botChainBlock: null,
    baseBlock: null,
    botChainReceiptCount: 14,
    isLive: true,
    rpcLatencyMs: { botChain: 95, base: 110 },
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // Sync live data from on-chain RPC and backend endpoints
  const syncData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchLiveProtocolData();
      setLiveState(data);
    } catch (err) {
      console.error("Live sync failed:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    syncData();
    const interval = setInterval(syncData, 15000); // 15s polling
    return () => clearInterval(interval);
  }, [syncData]);

  // Handle Chrome / Android PWA installation prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setShowInstallBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setShowInstallBanner(false);
    }
    setInstallPrompt(null);
  };

  return (
    <div className={`app-viewport-wrapper ${isExpanded ? "expanded-mode" : "preview-mode"}`}>
      <main className="mobile-device-chassis">
        {/* Dynamic Island on Desktop Phone chassis */}
        <div className="dynamic-island">
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#1c1c1e" }} />
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#2c2c2e" }} />
        </div>

        <div className="app-screen-body">
          {/* Header & Status Bar (Public.com style from Stitch) */}
          <Header
            isLive={liveState.isLive}
            lastSyncedAt={liveState.lastSyncedAt}
            isExpanded={isExpanded}
            onToggleExpanded={() => setIsExpanded(!isExpanded)}
            onRefresh={syncData}
            isRefreshing={isRefreshing}
          />

          {/* PWA Install Banner */}
          {showInstallBanner && (
            <div
              style={{
                margin: "4px 16px 8px 16px",
                padding: "8px 12px",
                background: "var(--bg-card)",
                border: "1px solid var(--border-card)",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "var(--primary-container)" }}>
                  install_mobile
                </span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dark)" }}>Install Mobile App</div>
                  <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>Add to Home Screen for fast access</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  type="button"
                  onClick={handleInstallClick}
                  style={{
                    background: "var(--inverse-surface)",
                    color: "var(--inverse-on-surface)",
                    border: "none",
                    borderRadius: "6px",
                    padding: "4px 10px",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Install
                </button>
                <button
                  type="button"
                  onClick={() => setShowInstallBanner(false)}
                  style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13 }}
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Tab Screen Routing */}
          <div style={{ flex: 1, paddingBottom: 16 }}>
            {activeTab === "overview" && (
              <OverviewTab
                metrics={liveState.metrics}
                chains={liveState.chains}
                queries={INITIAL_QUERIES}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === "queries" && <QueriesTab queries={INITIAL_QUERIES} />}

            {activeTab === "chains" && (
              <ChainsTab
                chains={liveState.chains}
                botChainBlock={liveState.botChainBlock}
                baseBlock={liveState.baseBlock}
                rpcLatencyMs={liveState.rpcLatencyMs}
              />
            )}

            {activeTab === "failures" && (
              <FailuresTab
                successRate={liveState.metrics.systemSuccessRatePct}
                rpcLatencyMs={liveState.rpcLatencyMs}
              />
            )}

            {activeTab === "wallets" && <WalletsTab metrics={liveState.metrics} />}
          </div>
        </div>

        {/* Floating Sticky Action Bar (Stitch Screen 47e2968666704549babdb9b4d1e66830 Blueprint) */}
        <div className="sticky-action-pill-bar">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 600, marginBottom: "4px" }}>
              <span style={{ color: "var(--text-secondary)" }}>Daily Spend Cap</span>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-dark)", fontWeight: 700 }}>
                ${liveState.metrics.agentSourceSpendUsd.toFixed(2)} / $5.00
              </span>
            </div>
            <div style={{ width: "100%", height: 5, borderRadius: 999, background: "var(--bg-container)", overflow: "hidden" }}>
              <div
                style={{
                  width: `${(liveState.metrics.agentSourceSpendUsd / 5.0) * 100}%`,
                  height: "100%",
                  background: "var(--primary-container)",
                  borderRadius: 999,
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>

          <button
            type="button"
            className="sticky-connect-btn"
            onClick={() => setActiveTab("wallets")}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>
              account_balance_wallet
            </span>
            <span>Connect Wallet</span>
          </button>
        </div>

        {/* Docked 5-Tab Bottom Navigation Bar (Stitch: Portfolio, Markets, Search, Inbox, Agents) */}
        <BottomNav activeTab={activeTab} onSelectTab={(tab) => setActiveTab(tab)} />
      </main>
    </div>
  );
}
