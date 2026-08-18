"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function getSnapshot() {
  return document.documentElement.getAttribute("data-theme") === "dark";
}

export function ThemeToggle() {
  // The blocking script in layout.tsx already stamps data-theme on <html>
  // before hydration, so this reads the live DOM as the source of truth
  // instead of duplicating that state — no effect, no server/client mismatch.
  const isDark = useSyncExternalStore(subscribe, getSnapshot, () => false);

  const toggle = () => {
    const next = !isDark;
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    try {
      localStorage.setItem("qerin-theme", next ? "dark" : "light");
    } catch {
      // localStorage unavailable (private mode, etc.) — theme just won't persist.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={isDark}
      className="qerin-pill-btn"
      style={{
        width: 36,
        height: 36,
        borderRadius: 9999,
        border: "1px solid var(--qerin-border)",
        background: "var(--qerin-surface)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      {isDark ? (
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M8 1.5v2M8 12.5v2M14.5 8h-2M3.5 8h-2M12.36 3.64l-1.42 1.42M5.06 10.94l-1.42 1.42M12.36 12.36l-1.42-1.42M5.06 5.06 3.64 3.64"
            stroke="var(--qerin-text)"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <circle cx="8" cy="8" r="3.2" fill="none" stroke="var(--qerin-text)" strokeWidth="1.4" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M13.5 9.5A6 6 0 0 1 6.5 2.5a6 6 0 1 0 7 7Z"
            fill="var(--qerin-text)"
          />
        </svg>
      )}
    </button>
  );
}
