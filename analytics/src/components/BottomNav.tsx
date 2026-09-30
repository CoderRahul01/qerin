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
      id: "chains",
      label: "Markets",
      icon: "query_stats",
    },
    {
      id: "queries",
      label: "Search",
      icon: "search",
    },
    {
      id: "wallets",
      label: "Inbox",
      icon: "notifications",
    },
    {
      id: "failures",
      label: "Agents",
      icon: "smart_toy",
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
                color: isActive ? "var(--text-dark)" : "var(--text-secondary)",
              }}
            >
              {tab.icon}
            </span>
            <span
              className="nav-tab-label"
              style={{
                color: isActive ? "var(--text-dark)" : "var(--text-secondary)",
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
