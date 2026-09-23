"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { AdminAnalytics, DailyPoint, Insight } from "./types";

const KEY_STORAGE = "qerin-admin-key";
const WINDOWS = [7, 30, 90] as const;

const mono = "var(--font-ibm-plex-mono), monospace";
const card = {
  border: "1px solid var(--qerin-border)",
  background: "var(--qerin-surface)",
  borderRadius: 14,
  padding: "18px 18px",
} as const;
const label = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--qerin-text-muted)",
} as const;

function readKey(): string {
  try {
    return window.sessionStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

function writeKey(value: string | null) {
  try {
    if (value) window.sessionStorage.setItem(KEY_STORAGE, value);
    else window.sessionStorage.removeItem(KEY_STORAGE);
  } catch {}
}

const fmtNum = (v: number) => new Intl.NumberFormat("en-US").format(v);
const fmtUsd = (v: number, digits = 2) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);

function change(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? "new vs previous period" : "no change vs previous period";
  const delta = Math.round(((current - previous) / previous) * 100);
  return `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)}% vs previous period`;
}

function Section({ title, children, note }: { title: string; children: ReactNode; note?: string }) {
  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ margin: 0, fontSize: 18, color: "var(--qerin-text)", letterSpacing: "-0.02em" }}>{title}</h2>
      {note && <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--qerin-text-muted)", lineHeight: 1.5 }}>{note}</p>}
      <div style={{ marginTop: 12 }}>{children}</div>
    </section>
  );
}

function Tile({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div style={card}>
      <div style={label}>{title}</div>
      <div style={{ marginTop: 8, fontSize: "clamp(24px, 3.4vw, 32px)", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--qerin-text)", fontFamily: mono }}>{value}</div>
      <div style={{ marginTop: 6, fontSize: 12.5, color: "var(--qerin-text-muted)", lineHeight: 1.45 }}>{detail}</div>
    </div>
  );
}

const INSIGHT_STYLE: Record<Insight["level"], { icon: string; text: string; color: string }> = {
  action: { icon: "!", text: "Act now", color: "var(--qerin-danger)" },
  watch: { icon: "◐", text: "Watch", color: "var(--qerin-series-2)" },
  good: { icon: "✓", text: "Working", color: "var(--qerin-series-1)" },
};

function Insights({ items }: { items: Insight[] }) {
  if (items.length === 0) {
    return <p style={{ color: "var(--qerin-text-muted)", fontSize: 14 }}>Not enough data for recommendations yet.</p>;
  }
  const order = { action: 0, watch: 1, good: 2 };
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {[...items].sort((a, b) => order[a.level] - order[b.level]).map((item) => {
        const style = INSIGHT_STYLE[item.level];
        return (
          <div key={item.title} style={{ ...card, display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px" }}>
            <span aria-hidden style={{ flex: "0 0 26px", height: 26, borderRadius: 13, border: `2px solid ${style.color}`, color: style.color, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 13 }}>{style.icon}</span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--qerin-text-muted)" }}>{style.text}</div>
              <div style={{ marginTop: 2, fontWeight: 700, color: "var(--qerin-text)" }}>{item.title}</div>
              <div style={{ marginTop: 4, fontSize: 13.5, color: "var(--qerin-text-muted)", lineHeight: 1.55 }}>{item.detail}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Funnel({ steps }: { steps: AdminAnalytics["funnel"] }) {
  const base = steps[0]?.count || 0;
  const max = Math.max(1, ...steps.map((s) => s.count));
  return (
    <div style={{ ...card, display: "grid", gap: 12 }}>
      {steps.map((step) => (
        <div key={step.step}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13.5, color: "var(--qerin-text)" }}>
            <span>{step.step}</span>
            <span style={{ fontFamily: mono }}>
              {fmtNum(step.count)} <span style={{ color: "var(--qerin-text-muted)" }}>· {base ? Math.round((step.count / base) * 100) : 0}%</span>
            </span>
          </div>
          <div style={{ marginTop: 6, height: 10, background: "var(--qerin-bg-soft)", borderRadius: 4 }}>
            <div style={{ width: `${(step.count / max) * 100}%`, minWidth: step.count ? 4 : 0, height: "100%", background: "var(--qerin-series-1)", borderRadius: 4 }} />
          </div>
        </div>
      ))}
      <p style={{ margin: 0, fontSize: 12, color: "var(--qerin-text-muted)" }}>Wallet-connected accounts only. Percent is of wallets connected.</p>
    </div>
  );
}

// ── Charts ──────────────────────────────────────────────────────────────
const W = 640;
const H = 180;
const PAD = { top: 12, right: 12, bottom: 24, left: 44 };

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / p) * p;
}

interface Series {
  name: string;
  color: string;
  values: number[];
}

function TimeChart({
  title,
  dates,
  series,
  kind,
  format,
}: {
  title: string;
  dates: string[];
  series: Series[];
  kind: "bar" | "line";
  format: (v: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const n = dates.length;
  const max = niceMax(Math.max(0, ...series.flatMap((s) => s.values)));
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const step = plotW / Math.max(n, 1);
  const x = (i: number) => PAD.left + step * i + step / 2;
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const barW = Math.max(2, Math.min(18, step - 2));
  const labelEvery = Math.max(1, Math.ceil(n / 6));

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ ...label, textTransform: "none", letterSpacing: 0, fontSize: 14, color: "var(--qerin-text)" }}>{title}</div>
        {series.length > 1 && (
          <div style={{ display: "flex", gap: 14, fontSize: 12, color: "var(--qerin-text-muted)" }}>
            {series.map((s) => (
              <span key={s.name} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 12, height: 3, borderRadius: 2, background: s.color }} />
                {s.name}
              </span>
            ))}
          </div>
        )}
      </div>
      <div style={{ position: "relative", marginTop: 8 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={title} style={{ display: "block", overflow: "visible" }} onMouseLeave={() => setHover(null)}>
          {[0, 0.5, 1].map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(max * t)} y2={y(max * t)} stroke="var(--qerin-border)" strokeWidth={1} />
              <text x={PAD.left - 6} y={y(max * t) + 4} textAnchor="end" fontSize={10} fill="var(--qerin-text-muted)">{format(max * t)}</text>
            </g>
          ))}
          {dates.map((d, i) =>
            i % labelEvery === 0 ? (
              <text key={d} x={x(i)} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--qerin-text-muted)">{d.slice(5)}</text>
            ) : null
          )}
          {hover !== null && kind === "line" && <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + plotH} stroke="var(--qerin-text-muted)" strokeWidth={1} strokeDasharray="3 3" />}
          {kind === "bar"
            ? series[0].values.map((v, i) => {
                const h = (v / max) * plotH;
                return v > 0 ? (
                  <path
                    key={i}
                    d={`M${x(i) - barW / 2},${PAD.top + plotH} v${-Math.max(h - 2, 0)} q0,-2 2,-2 h${barW - 4} q2,0 2,2 v${Math.max(h - 2, 0)} z`}
                    fill={series[0].color}
                    opacity={hover === null || hover === i ? 1 : 0.45}
                  />
                ) : null;
              })
            : series.map((s) => (
                <g key={s.name}>
                  <polyline fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
                  {hover !== null && <circle cx={x(hover)} cy={y(s.values[hover])} r={4} fill={s.color} stroke="var(--qerin-surface)" strokeWidth={2} />}
                </g>
              ))}
          {dates.map((d, i) => (
            <rect key={d} x={PAD.left + step * i} y={PAD.top} width={step} height={plotH} fill="transparent" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} />
          ))}
        </svg>
        {hover !== null && (
          <div
            role="status"
            style={{
              position: "absolute",
              top: 0,
              left: `${(x(hover) / W) * 100}%`,
              transform: `translateX(${hover > n / 2 ? "-105%" : "5%"})`,
              pointerEvents: "none",
              background: "var(--qerin-bg)",
              border: "1px solid var(--qerin-border)",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 12,
              color: "var(--qerin-text)",
              whiteSpace: "nowrap",
              boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
            }}
          >
            <div style={{ color: "var(--qerin-text-muted)" }}>{dates[hover]}</div>
            {series.map((s) => (
              <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                {s.name}: <strong style={{ fontFamily: mono }}>{format(s.values[hover])}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DailyTable({ daily }: { daily: DailyPoint[] }) {
  return (
    <details style={{ ...card, marginTop: 12 }}>
      <summary style={{ cursor: "pointer", fontWeight: 600, color: "var(--qerin-text)" }}>View daily numbers as a table</summary>
      <div style={{ overflowX: "auto", marginTop: 10 }}>
        <Table
          head={["Date", "New accounts", "Paid queries", "Earned", "Cash in", "AI + source cost"]}
          rows={[...daily].reverse().map((d) => [d.date, fmtNum(d.newAccounts), fmtNum(d.queries), fmtUsd(d.earnedUsd), fmtUsd(d.cashInUsd), fmtUsd(d.costUsd, 4)])}
        />
      </div>
    </details>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr>
          {head.map((h, i) => (
            <th key={h} style={{ textAlign: i === 0 ? "left" : "right", padding: "8px 8px", borderBottom: "1px solid var(--qerin-border)", color: "var(--qerin-text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={head.length} style={{ padding: 10, color: "var(--qerin-text-muted)" }}>No data yet.</td></tr>
        ) : (
          rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, i) => (
                <td key={i} style={{ textAlign: i === 0 ? "left" : "right", padding: "7px 8px", borderBottom: "1px solid var(--qerin-border)", color: "var(--qerin-text)", fontFamily: i === 0 ? undefined : mono, whiteSpace: "nowrap" }}>{cell}</td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function Breakdown({ title, rows }: { title: string; rows: Array<[string, string, string?]> }) {
  return (
    <div style={card}>
      <div style={{ fontWeight: 700, color: "var(--qerin-text)" }}>{title}</div>
      <dl style={{ margin: "10px 0 0", display: "grid", gap: 8 }}>
        {rows.map(([k, v, hint]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13.5 }}>
            <dt style={{ color: "var(--qerin-text-muted)" }}>
              {k}
              {hint && <div style={{ fontSize: 11.5 }}>{hint}</div>}
            </dt>
            <dd style={{ margin: 0, fontFamily: mono, color: "var(--qerin-text)" }}>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────
export function AdminDashboard() {
  const [adminKey, setAdminKey] = useState("");
  const [draftKey, setDraftKey] = useState("");
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setAdminKey(readKey()), 0);
    return () => window.clearTimeout(id);
  }, []);

  const load = useCallback(async (key: string, windowDays: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/analytics?days=${windowDays}`, { headers: { "X-Qerin-Admin-Key": key }, cache: "no-store" });
      const body = (await response.json()) as AdminAnalytics & { error?: string };
      if (response.status === 401) {
        writeKey(null);
        setAdminKey("");
        throw new Error(body.error || "Invalid admin key");
      }
      if (!response.ok) throw new Error(body.error || "Could not load analytics");
      setData(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!adminKey) return;
    const id = window.setTimeout(() => void load(adminKey, days), 0);
    return () => window.clearTimeout(id);
  }, [adminKey, days, load]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const key = draftKey.trim();
    if (!key) return;
    writeKey(key);
    setAdminKey(key);
    setDraftKey("");
  }

  if (!adminKey) {
    return (
      <form onSubmit={submit} style={{ ...card, maxWidth: 420 }}>
        <label htmlFor="admin-key" style={{ fontWeight: 700, color: "var(--qerin-text)" }}>Admin key</label>
        <p style={{ margin: "6px 0 12px", fontSize: 13, color: "var(--qerin-text-muted)" }}>The value of QERIN_ADMIN_KEY in your deployment. Kept only for this browser tab.</p>
        {error && <p role="alert" style={{ margin: "0 0 10px", color: "var(--qerin-danger)", fontSize: 13 }}>{error}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <input id="admin-key" type="password" autoComplete="off" value={draftKey} onChange={(e) => setDraftKey(e.target.value)} style={{ flex: 1, minHeight: 42, padding: "0 12px", borderRadius: 8, border: "1px solid var(--qerin-border)", background: "var(--qerin-bg)", color: "var(--qerin-text)" }} />
          <button type="submit" style={{ minHeight: 42, padding: "0 16px", borderRadius: 8, border: 0, background: "var(--qerin-accent)", color: "var(--qerin-accent-contrast)", fontWeight: 700, cursor: "pointer" }}>Open</button>
        </div>
      </form>
    );
  }

  const controls = (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <div role="group" aria-label="Time window" style={{ display: "inline-flex", border: "1px solid var(--qerin-border)", borderRadius: 9, overflow: "hidden" }}>
        {WINDOWS.map((w) => (
          <button key={w} type="button" aria-pressed={days === w} onClick={() => setDays(w)} style={{ minHeight: 38, padding: "0 14px", border: 0, background: days === w ? "var(--qerin-text)" : "transparent", color: days === w ? "var(--qerin-bg)" : "var(--qerin-text)", fontWeight: 600, cursor: "pointer" }}>
            {w}d
          </button>
        ))}
      </div>
      <button type="button" onClick={() => void load(adminKey, days)} disabled={loading} style={{ minHeight: 38, padding: "0 14px", borderRadius: 9, border: "1px solid var(--qerin-border)", background: "transparent", color: "var(--qerin-accent)", fontWeight: 700, cursor: "pointer" }}>
        {loading ? "Loading…" : "Refresh"}
      </button>
      <button type="button" onClick={() => { writeKey(null); setAdminKey(""); setData(null); }} style={{ minHeight: 38, padding: "0 14px", borderRadius: 9, border: "1px solid var(--qerin-border)", background: "transparent", color: "var(--qerin-text-muted)", cursor: "pointer" }}>
        Lock
      </button>
    </div>
  );

  if (!data) {
    return (
      <>
        {controls}
        <div style={{ ...card, marginTop: 16 }} role={error ? "alert" : "status"}>
          {error ? <span style={{ color: "var(--qerin-danger)" }}>{error}</span> : "Loading founder analytics…"}
        </div>
      </>
    );
  }

  const { users, revenue, costs, unitEconomics: ue, daily } = data;
  const dates = daily.map((d) => d.date);
  const costWindow = costs.sourceSpendWindowUsd + costs.llmCostWindowUsd;
  const windowText = `last ${data.windowDays} days`;

  return (
    <>
      {controls}
      {error && <p role="alert" style={{ color: "var(--qerin-danger)", fontSize: 13 }}>{error}</p>}

      <section aria-label="Key numbers" style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <Tile title="Total users" value={fmtNum(users.totalAccounts)} detail={`${fmtNum(users.newInWindow)} new in ${windowText} · ${change(users.newInWindow, users.newPrevWindow)}`} />
        <Tile title="Active researchers" value={fmtNum(users.activeInWindow)} detail={`Ran a paid query in ${windowText} · ${change(users.activeInWindow, users.activePrevWindow)}`} />
        <Tile title="Cash collected" value={fmtUsd(revenue.cashInWindowUsd)} detail={`Real top-ups in ${windowText} · ${fmtUsd(revenue.cashInUsd)} all-time`} />
        <Tile title="Revenue earned" value={fmtUsd(revenue.earnedWindowUsd)} detail={`Query charges in ${windowText} · ${change(revenue.earnedWindowUsd, revenue.earnedPrevWindowUsd)}`} />
        <Tile title="AI + source spend" value={fmtUsd(costWindow, costWindow < 1 ? 4 : 2)} detail={`${fmtUsd(costs.sourceSpendWindowUsd, 4)} sources · ${fmtUsd(costs.llmCostWindowUsd, 4)} LLM`} />
        <Tile title="Gross margin" value={ue.grossMarginPct === null ? "–" : `${ue.grossMarginPct}%`} detail={`${fmtUsd(ue.grossMarginUsd)} all-time after AI and source costs`} />
      </section>

      <Section title="What to do next" note="Generated from your numbers. Each item states the data it is based on.">
        <Insights items={data.insights} />
      </Section>

      <Section title="User journey" note="Where wallet users drop off between connecting and paying.">
        <Funnel steps={data.funnel} />
      </Section>

      <Section title="Trends" note={`Daily, ${windowText} (UTC). Hover a day for exact values.`}>
        <div style={{ display: "grid", gap: 12 }}>
          <TimeChart title="Revenue earned vs AI + source cost (USD)" kind="line" dates={dates} format={(v) => fmtUsd(v)} series={[
            { name: "Earned", color: "var(--qerin-series-1)", values: daily.map((d) => d.earnedUsd) },
            { name: "Cost", color: "var(--qerin-series-2)", values: daily.map((d) => d.costUsd) },
          ]} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            <TimeChart title="Paid queries per day" kind="bar" dates={dates} format={(v) => fmtNum(Math.round(v))} series={[{ name: "Queries", color: "var(--qerin-series-1)", values: daily.map((d) => d.queries) }]} />
            <TimeChart title="New accounts per day" kind="bar" dates={dates} format={(v) => fmtNum(Math.round(v))} series={[{ name: "New accounts", color: "var(--qerin-series-1)", values: daily.map((d) => d.newAccounts) }]} />
          </div>
          <TimeChart title="Cash collected per day (USD)" kind="bar" dates={dates} format={(v) => fmtUsd(v)} series={[{ name: "Cash in", color: "var(--qerin-series-1)", values: daily.map((d) => d.cashInUsd) }]} />
        </div>
        <DailyTable daily={daily} />
      </Section>

      <Section title="Money" note="Cash collected is real on-chain top-ups. Revenue earned is what queries charged, partly paid with free pass credit.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
          <Breakdown title="Revenue (all-time)" rows={[
            ["Cash collected", fmtUsd(revenue.cashInUsd), "Verified top-up deposits"],
            ...Object.entries(revenue.cashInByNetwork).map(([k, v]) => [`  · ${k}`, fmtUsd(v)] as [string, string]),
            ["Earned from app", fmtUsd(revenue.earnedAppUsd)],
            ["Earned from developer API", fmtUsd(revenue.earnedApiUsd), "x402 paid calls"],
            ["Free pass credit issued", fmtUsd(revenue.promoCreditsUsd), "Not revenue"],
            ["Unspent user balances", fmtUsd(revenue.outstandingBalanceUsd), "Owed as future queries"],
          ]} />
          <Breakdown title="Unit economics (per query)" rows={[
            ["Paid queries", fmtNum(ue.queries), `${fmtNum(ue.queriesWindow)} in ${windowText}`],
            ["Price", fmtUsd(ue.avgRevenuePerQueryUsd, 3)],
            ["Source cost", fmtUsd(ue.avgSourceCostPerQueryUsd, 4)],
            ["LLM cost", fmtUsd(ue.avgLlmCostPerQueryUsd, 5), `${fmtNum(costs.llmTrackedQueries)} queries tracked`],
            ["Revenue per researcher", users.researchers ? fmtUsd(revenue.earnedAppUsd / users.researchers) : "–"],
          ]} />
          <Breakdown title="AI spend (all-time)" rows={[
            ["Paid sources (x402)", fmtUsd(costs.sourceSpendUsd, 4)],
            ["LLM synthesis", fmtUsd(costs.llmCostUsd, 5), `${fmtNum(costs.llmTokens)} tokens`],
            ...costs.modelMix.map((m) => [`  · ${m.model}`, `${fmtNum(m.queries)}q · ${fmtUsd(m.costUsd, 4)}`] as [string, string]),
          ]} />
        </div>
      </Section>

      <Section title="Users" note="Signals beyond the funnel.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <Tile title="Wallet users" value={fmtNum(users.walletAccounts)} detail={`${fmtNum(users.totalAccounts - users.walletAccounts)} anonymous`} />
          <Tile title="Paying users" value={fmtNum(users.depositors)} detail="Topped up real money" />
          <Tile title="Repeat researchers" value={fmtNum(users.repeatResearchers)} detail={`of ${fmtNum(users.researchers)} who ran a query`} />
          <Tile title="Waitlist" value={fmtNum(users.waitlistSignups)} detail="Email signups" />
          <Tile title="API keys" value={fmtNum(users.apiKeysIssued)} detail="Developer keys issued" />
        </div>
      </Section>

      <Section title="Top accounts" note="Your best users. Talk to them to learn what to build next.">
        <div style={{ ...card, overflowX: "auto" }}>
          <Table
            head={["Account", "Queries", "Earned", "Deposited", "Balance", "Last active"]}
            rows={data.topAccounts.map((a) => [a.account, fmtNum(a.queries), fmtUsd(a.earnedUsd), fmtUsd(a.depositedUsd), fmtUsd(a.balanceUsd), a.lastActive ? new Date(a.lastActive).toLocaleDateString() : "–"])}
          />
        </div>
      </Section>

      <p style={{ marginTop: 20, fontSize: 12, color: "var(--qerin-text-muted)" }}>Updated {new Date(data.generatedAt).toLocaleString()} · cached up to 60 seconds.</p>
    </>
  );
}
