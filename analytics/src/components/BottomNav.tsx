"use client";

import { NavTab } from "../lib/types";

interface BottomNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export function BottomNav({ activeTab, onSelectTab }: BottomNavProps) {
  const tabs: Array<{ id: NavTab; label: string; icon: string }> = [
    {
      id: "overview",
      label: "Portfolio",
      icon: "pie_chart",
    },
    {
      id: "growth",
      label: "Growth",
      icon: "trending_up",
    },
    {
      id: "queries",
      label: "Queries",
      icon: "search",
    },
    {
      id: "chains",
      label: "Markets",
      icon: "alt_route",
    },
    {
      id: "wallets",
      label: "Wallets",
      icon: "account_balance_wallet",
    },
    {
      id: "failures",
      label: "Health",
      icon: "health_and_safety",
    },
  ];

  return (
    <nav className="docked-bottom-nav">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={`nav-tab-button ${isActive ? "active" : ""}`}
            onClick={() => onSelectTab(tab.id)}
          >
            <span
              className="material-symbols-outlined nav-tab-icon"
              style={{
                fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                color: isActive ? "var(--primary-container)" : "var(--text-secondary)",
              }}
            >
              {tab.icon}
            </span>
            <span
              className="nav-tab-label"
              style={{
                color: isActive ? "var(--text-dark)" : "var(--text-secondary)",
                fontWeight: isActive ? 700 : 500,
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
