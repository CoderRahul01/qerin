"use client";

import { useState } from "react";
import { NavTab } from "../lib/types";

interface HeaderProps {
  isLive: boolean;
  lastSyncedAt: string;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenConfig?: () => void;
  unreadNotificationsCount?: number;
  onOpenNotifications?: () => void;
  activeTab?: NavTab;
  onSelectTab?: (tab: NavTab) => void;
}

export function Header({
  isLive,
  lastSyncedAt,
  isExpanded,
  onToggleExpanded,
  onRefresh,
  isRefreshing,
  onOpenConfig,
  unreadNotificationsCount = 0,
  onOpenNotifications,
  activeTab = "overview",
  onSelectTab,
}: HeaderProps) {
  const [isDark, setIsDark] = useState(false);

  const toggleDarkMode = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "Qerin Protocol Analytics",
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  const desktopTabs: Array<{ id: NavTab; label: string; icon: string }> = [
    { id: "overview", label: "Portfolio", icon: "pie_chart" },
    { id: "growth", label: "Founder Growth", icon: "trending_up" },
    { id: "queries", label: "Live Queries", icon: "search" },
    { id: "chains", label: "Markets", icon: "alt_route" },
    { id: "wallets", label: "Wallets", icon: "account_balance_wallet" },
    { id: "failures", label: "Diagnostics", icon: "health_and_safety" },
  ];

  return (
    <>
      {/* Network Topology Background Watermark (from Stitch) */}
      <div className="network-watermark">
        <svg
          viewBox="0 0 400 300"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.8"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: "100%", height: "100%", color: "var(--text-secondary)" }}
        >
          <circle cx="60" cy="50" fill="currentColor" r="3" />
          <circle cx="180" cy="40" fill="currentColor" r="2.5" />
          <circle cx="310" cy="70" fill="currentColor" r="3" />
          <circle cx="120" cy="130" fill="currentColor" r="2.5" />
          <circle cx="260" cy="120" fill="currentColor" r="3.5" />
          <circle cx="360" cy="150" fill="currentColor" r="2" />
          <circle cx="50" cy="200" fill="currentColor" r="3" />
          <circle cx="210" cy="190" fill="currentColor" r="2.5" />
          <circle cx="340" cy="240" fill="currentColor" r="3" />
          <line strokeDasharray="3 3" x1="60" x2="180" y1="50" y2="40" />
          <line x1="180" x2="260" y1="40" y2="120" />
          <line x1="180" x2="310" y1="40" y2="70" />
          <line x1="310" x2="360" y1="70" y2="150" />
          <line x1="60" x2="120" y1="50" y2="130" />
          <line strokeDasharray="2 2" x1="120" x2="260" y1="130" y2="120" />
          <line x1="260" x2="210" y1="120" y2="190" />
          <line x1="120" x2="50" y1="130" y2="200" />
          <line x1="50" x2="210" y1="200" y2="190" />
          <line x1="210" x2="340" y1="190" y2="240" />
          <line x1="260" x2="340" y1="120" y2="240" />
        </svg>
      </div>

      {/* Main Top App Header (Public.com Style) */}
      <header className="app-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            className="header-back-pill"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "20px", color: "var(--primary-container)" }}
            >
              hub
            </span>
            <span style={{ fontWeight: 800, letterSpacing: "-0.02em" }}>QERIN</span>
          </button>

          {/* Desktop Navigation Tabs (Visible on Laptop / Desktop screens) */}
          {onSelectTab && (
            <nav className="desktop-nav-tabs">
              {desktopTabs.map((t) => {
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`desktop-tab-btn ${isActive ? "active" : ""}`}
                    onClick={() => onSelectTab(t.id)}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                      {t.icon}
                    </span>
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </nav>
          )}
        </div>

        <div className="header-action-group">
          {/* Notifications Bell with unread badge */}
          {onOpenNotifications && (
            <button
              className="header-icon-btn"
              onClick={onOpenNotifications}
              title="Protocol Notifications"
              style={{ position: "relative" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                notifications
              </span>
              {unreadNotificationsCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#ef4444",
                    border: "2px solid var(--bg-card)",
                  }}
                />
              )}
            </button>
          )}

          {/* Share */}
          <button className="header-icon-btn" onClick={handleShare} title="Share Analytics">
            <span className="material-symbols-outlined" style={{ fontSize: "17px" }}>
              ios_share
            </span>
          </button>

          {/* Dark / Light Toggle */}
          <button className="header-icon-btn" onClick={toggleDarkMode} title="Toggle Theme">
            <span className="material-symbols-outlined" style={{ fontSize: "17px" }}>
              {isDark ? "light_mode" : "dark_mode"}
            </span>
          </button>

          {/* Refresh RPC Sync */}
          <button
            className="header-icon-btn"
            onClick={onRefresh}
            title={`Refresh On-Chain (Synced: ${lastSyncedAt})`}
            disabled={isRefreshing}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: "17px",
                transform: isRefreshing ? "rotate(360deg)" : "none",
                transition: "transform 0.6s linear",
              }}
            >
              refresh
            </span>
          </button>

          {/* Protocol Configuration & Settings */}
          {onOpenConfig && (
            <button className="header-icon-btn" onClick={onOpenConfig} title="Protocol Configuration">
              <span className="material-symbols-outlined" style={{ fontSize: "17px" }}>
                tune
              </span>
            </button>
          )}

          {/* Desktop Frame Toggle */}
          <button
            className="header-icon-btn desktop-only-btn"
            onClick={onToggleExpanded}
            title={isExpanded ? "Standard Mode" : "Full Screen Mode"}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "17px" }}>
              {isExpanded ? "smartphone" : "fit_screen"}
            </span>
          </button>
        </div>
      </header>

      {/* Asset Identity Header (from Stitch Screen 47e2968666704549babdb9b4d1e66830) */}
      <section className="asset-identity-header">
        <div className="asset-identity-brand">
          <div className="brand-logo-circle">
            <div className="brand-logo-inner">
              <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>
                hub
              </span>
            </div>
            <div className="brand-badge-bolt">
              <span className="material-symbols-outlined" style={{ fontSize: "9px", fontWeight: "bold" }}>
                bolt
              </span>
            </div>
          </div>
          <div>
            <div className="asset-title-row">
              <h1 className="asset-title-text">Qerin Protocol</h1>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "17px", color: "var(--primary-container)", fontVariationSettings: "'FILL' 1" }}
              >
                verified
              </span>
            </div>
            <p className="asset-subtitle">Autonomous Research Settlement Network</p>
          </div>
        </div>

        <div className="network-active-chip">
          <span className="live-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--primary-container)" }} />
          <span>MAINNET ACTIVE</span>
        </div>
      </section>
    </>
  );
}
