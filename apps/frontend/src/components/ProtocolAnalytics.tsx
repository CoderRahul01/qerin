"use client";

import { useCallback, useEffect, useState } from "react";

interface GrowthWindow {
  paidResearchQueries: number;
  agentSourceSpendUsd: number;
  activeResearchAccounts: number;
}

interface PublicAnalytics {
  allTime: GrowthWindow;
  last30Days: GrowthWindow;
  generatedAt: string;
  methodology: string;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div style={{ border: "1px solid var(--qerin-border)", background: "var(--qerin-surface)", borderRadius: 14, padding: "20px 18px" }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: "var(--qerin-text-muted)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 8, fontSize: "clamp(28px, 4vw, 38px)", letterSpacing: "-0.04em", fontWeight: 700, color: "var(--qerin-text)", fontFamily: "var(--font-ibm-plex-mono), monospace" }}>{value}</div>
      <p style={{ margin: "8px 0 0", color: "var(--qerin-text-muted)", fontSize: 13, lineHeight: 1.5 }}>{detail}</p>
    </div>
  );
}

export function ProtocolAnalytics() {
  const [data, setData] = useState<PublicAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/analytics", { cache: "no-store" });
      const body = (await response.json()) as PublicAnalytics & { error?: string };
      if (!response.ok) throw new Error(body.error || "Could not load analytics");
      setData(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Defer the initial request until after paint so loading state can render
    // without a synchronous state update from the effect body.
    const requestId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(requestId);
  }, [load]);

  if (loading) {
    return (
      <section aria-busy="true" aria-label="Loading protocol analytics" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        {[0, 1, 2].map((item) => <div key={item} style={{ height: 178, borderRadius: 14, background: "var(--qerin-surface)", border: "1px solid var(--qerin-border)" }} className="qerin-analytics-skeleton" />)}
      </section>
    );
  }

  if (error || !data) {
    return (
      <section role="alert" style={{ border: "1px solid rgba(239, 68, 68, 0.35)", background: "rgba(239, 68, 68, 0.06)", borderRadius: 14, padding: 20 }}>
        <div style={{ fontWeight: 700, color: "var(--qerin-text)" }}>Analytics are temporarily unavailable</div>
        <p style={{ margin: "6px 0 14px", color: "var(--qerin-text-muted)", fontSize: 14 }}>{error || "Try again in a moment."}</p>
        <button type="button" onClick={() => void load()} style={{ minHeight: 40, padding: "0 14px", borderRadius: 8, border: "1px solid var(--qerin-border)", background: "var(--qerin-surface)", color: "var(--qerin-text)", cursor: "pointer", fontWeight: 600 }}>
          Retry
        </button>
      </section>
    );
  }

  const recent = data.last30Days;
  const total = data.allTime;
  return (
    <>
      <section aria-label="Last 30 days" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        <MetricCard label="Paid research deliveries" value={formatNumber(recent.paidResearchQueries)} detail="Completed deliveries with at least one verifiable paid source." />
        <MetricCard label="Active research accounts" value={formatNumber(recent.activeResearchAccounts)} detail="Privacy-preserving count of accounts completing paid research." />
        <MetricCard label="Agent source spend" value={formatUsd(recent.agentSourceSpendUsd)} detail="Actual source settlement spend; public enrichment is excluded." />
      </section>

      <section style={{ marginTop: 18, border: "1px solid var(--qerin-border)", borderRadius: 14, padding: "18px 20px", background: "var(--qerin-surface)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--qerin-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>All-time protocol activity</div>
            <div style={{ marginTop: 8, fontSize: 16, color: "var(--qerin-text)", fontWeight: 700 }}>
              {formatNumber(total.paidResearchQueries)} paid deliveries · {formatNumber(total.activeResearchAccounts)} research accounts · {formatUsd(total.agentSourceSpendUsd)} source spend
            </div>
          </div>
          <button type="button" onClick={() => void load()} style={{ minHeight: 40, padding: "0 14px", borderRadius: 8, border: "1px solid var(--qerin-border)", background: "transparent", color: "var(--qerin-accent)", cursor: "pointer", fontWeight: 700 }}>
            Refresh data
          </button>
        </div>
        <p style={{ margin: "14px 0 0", fontSize: 12.5, lineHeight: 1.55, color: "var(--qerin-text-muted)" }}>{data.methodology}</p>
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--qerin-text-muted)" }}>Updated {new Date(data.generatedAt).toLocaleString()} · Cached up to five minutes.</p>
      </section>
    </>
  );
}
