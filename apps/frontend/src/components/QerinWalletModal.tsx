"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchQerinWallet,
  fundBaseFromConnectedWallet,
  provisionQerinWallet,
  shortAddress,
  solanaPayUrl,
  updateAgentPolicy,
  waitForDeposit,
  withdrawFromQerinWallet,
  type QerinWalletView,
  type RailId,
  type RailWallet,
} from "@/lib/qerinWallet";

// The user's Qerin Wallet: their own wallet on each rail, which their Qerin
// agent spends from inside the limits they sign. Qerin never holds a shared
// float — everything shown here is that user's on-chain USDC.

export type WalletTab = "fund" | "limits" | "withdraw" | "activity";

interface Props {
  accountId: string;
  connectedWallet: string | null;
  reason?: string | null;
  initialTab?: WalletTab;
  onClose: () => void;
  onBalance?: (totalUsd: number) => void;
}

const PRESETS = [1, 5, 10, 25];

const RAIL_COLOR: Record<RailId, string> = { base: "#3B82F6", solana: "#A855F7" };

function usd(value: number, digits = 2): string {
  return `$${value.toFixed(digits)}`;
}

function friendlyError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err ?? "");
  if (/reject|denied|cancel/i.test(message)) return "You cancelled the request in your wallet. Nothing changed.";
  return message || "Something went wrong. Try again.";
}

function RailBadge({ rail, name }: { rail: RailId; name: string }) {
  return (
    <span className="qw-rail-badge" style={{ color: RAIL_COLOR[rail], borderColor: `${RAIL_COLOR[rail]}55`, background: `${RAIL_COLOR[rail]}14` }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: RAIL_COLOR[rail] }} />
      {name}
    </span>
  );
}

function CopyAddress({ wallet }: { wallet: RailWallet }) {
  const [copied, setCopied] = useState(false);
  if (!wallet.address) return null;
  return (
    <div className="qw-address">
      <code title={wallet.address}>{wallet.address}</code>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button
          type="button"
          className="qw-chip-btn"
          onClick={() => {
            navigator.clipboard?.writeText(wallet.address!).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }).catch(() => {});
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
        {wallet.explorerUrl && (
          <a className="qw-chip-btn" href={wallet.explorerUrl} target="_blank" rel="noreferrer">Explorer ↗</a>
        )}
      </div>
    </div>
  );
}

function AmountPicker({ value, onChange, max }: { value: string; onChange: (v: string) => void; max?: number }) {
  return (
    <div>
      <div className="qw-presets">
        {PRESETS.map((p) => (
          <button key={p} type="button" className={`qw-preset ${Number(value) === p ? "is-active" : ""}`} onClick={() => onChange(String(p))}>
            ${p}
          </button>
        ))}
        {max !== undefined && (
          <button type="button" className="qw-preset" onClick={() => onChange(String(Math.floor(max * 1e6) / 1e6))}>Max</button>
        )}
      </div>
      <label className="qw-field">
        <span>Amount (USDC)</span>
        <input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00" />
      </label>
    </div>
  );
}

export function QerinWalletModal({ accountId, connectedWallet, reason, initialTab = "fund", onClose, onBalance }: Props) {
  const [view, setView] = useState<QerinWalletView | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<WalletTab>(initialTab);
  const [rail, setRail] = useState<RailId>("base");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; href?: string } | null>(null);
  const [amount, setAmount] = useState("5");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [solDestination, setSolDestination] = useState("");
  const [perQuery, setPerQuery] = useState("");
  const [daily, setDaily] = useState("");
  const [paused, setPaused] = useState(false);
  const watchRef = useRef<AbortController | null>(null);

  const isOwner = Boolean(connectedWallet && connectedWallet.toLowerCase() === accountId.toLowerCase());

  const apply = useCallback((next: QerinWalletView) => {
    setView(next);
    setPerQuery(next.policy.perQueryUsd.toFixed(2));
    setDaily(next.policy.dailyUsd.toFixed(2));
    setPaused(next.policy.paused);
    onBalance?.(next.totalUsdc + next.legacyCredit);
  }, [onBalance]);

  useEffect(() => {
    let alive = true;
    fetchQerinWallet(accountId, true)
      .then((v) => { if (alive) apply(v); })
      .catch((err) => { if (alive) setError(friendlyError(err)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; watchRef.current?.abort(); };
  }, [accountId, apply]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const wallets = useMemo(() => (view?.wallets ?? []).filter((w) => w.address), [view]);
  const hasWallet = wallets.length > 0;
  const active = wallets.find((w) => w.rail === rail) ?? wallets[0] ?? null;
  const env = view?.env ?? "mainnet";

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError(null);
    setNotice(null);
    try {
      await fn();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(null);
    }
  };

  const watchForDeposit = async (previousTotal: number) => {
    watchRef.current?.abort();
    const controller = new AbortController();
    watchRef.current = controller;
    setNotice({ text: "Watching the chain for your deposit…" });
    const updated = await waitForDeposit(accountId, previousTotal, { signal: controller.signal });
    if (controller.signal.aborted) return;
    if (updated) {
      apply(updated);
      setNotice({ text: `Received. Your Qerin wallet now holds ${usd(updated.totalUsdc)} USDC.` });
    } else {
      setNotice({ text: "Not seen yet. Transfers can take a minute. Tap Refresh to check again." });
    }
  };

  const handleCreate = () => run("create", async () => {
    apply(await provisionQerinWallet(accountId));
    setNotice({ text: "Your Qerin wallet is ready. Fund it to put your agent to work." });
  });

  const handleRefresh = () => run("refresh", async () => {
    apply(await fetchQerinWallet(accountId, true));
  });

  const handleFundBase = () => run("fund", async () => {
    if (!active?.address || !view) return;
    const value = Number(amount);
    if (!(value > 0)) throw new Error("Enter an amount to fund.");
    const tx = await fundBaseFromConnectedWallet(active.address, value, env);
    setNotice({ text: `Transfer sent (${shortAddress(tx)}). Waiting for Base to confirm…` });
    await watchForDeposit(view.totalUsdc);
  });

  const handleSolanaSent = () => run("sol-check", async () => {
    if (!view) return;
    await watchForDeposit(view.totalUsdc);
  });

  const handleSavePolicy = () => run("policy", async () => {
    const next = await updateAgentPolicy(accountId, { perQueryUsd: Number(perQuery), dailyUsd: Number(daily), paused });
    apply(next);
    setNotice({ text: "Signed and saved. Your agent now works inside these limits." });
  });

  const handleWithdraw = () => run("withdraw", async () => {
    if (!active) return;
    const value = Number(withdrawAmount);
    if (!(value > 0)) throw new Error("Enter an amount to withdraw.");
    const result = await withdrawFromQerinWallet(accountId, active.rail, value, active.family === "svm" ? solDestination.trim() : undefined);
    apply(result.wallet);
    setWithdrawAmount("");
    setNotice({ text: `Withdrew ${usd(value)} USDC.`, href: result.explorerUrl });
  });

  const spentPct = view ? Math.min(100, (view.spentTodayUsd / Math.max(view.policy.dailyUsd, 0.01)) * 100) : 0;

  return (
    <div className="qw-overlay" onClick={busy ? undefined : onClose}>
      <div className="qw-dialog" role="dialog" aria-modal="true" aria-labelledby="qw-title" onClick={(e) => e.stopPropagation()}>
        <header className="qw-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div className="qw-logo" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="6" width="18" height="14" rx="3" />
                <path d="M3 10h18M16 15h2" />
              </svg>
            </div>
            <div style={{ minWidth: 0 }}>
              <div id="qw-title" className="qw-title">
                Qerin Wallet {env === "testnet" && <span className="qw-testnet">Testnet</span>}
              </div>
              <div className="qw-subtitle">{reason ?? "Your agent's treasury. Only your signature moves funds out."}</div>
            </div>
          </div>
          <button type="button" className="qw-close" onClick={onClose} aria-label="Close Qerin Wallet" disabled={Boolean(busy)}>✕</button>
        </header>

        {loading && <div className="qw-empty">Loading your Qerin wallet…</div>}

        {!loading && !isOwner && (
          <div className="qw-empty">
            Connect the wallet that owns this account (MetaMask, BO Wallet or Coinbase Wallet) to open your Qerin wallet.
          </div>
        )}

        {!loading && isOwner && view && !view.enabled && (
          <div className="qw-empty">Qerin wallets aren&apos;t enabled on this deployment yet.</div>
        )}

        {!loading && isOwner && view?.enabled && !hasWallet && (
          <div className="qw-create">
            <h3>Create your Qerin wallet</h3>
            <ul>
              <li><b>Your own wallet</b> on {view.wallets.map((w) => w.name).join(" and ")}, separate from MetaMask.</li>
              <li><b>Your Qerin agent spends only from it</b>, paying sources and the {usd(view.serviceFeeUsd)} fee per answer.</li>
              <li><b>You set the limits.</b> Changes and withdrawals need your signature.</li>
            </ul>
            <button type="button" className="qw-primary" onClick={handleCreate} disabled={busy === "create"}>
              {busy === "create" ? "Creating…" : "Sign in & create wallet"}
            </button>
            <p className="qw-hint">One gasless signature. No transaction, no fee.</p>
          </div>
        )}

        {!loading && isOwner && view?.enabled && hasWallet && (
          <>
            <section className="qw-summary">
              <div>
                <div className="qw-label">Balance</div>
                <div className="qw-total">{usd(view.totalUsdc)} <span>USDC</span></div>
                {view.legacyCredit > 0 && <div className="qw-hint">+ {usd(view.legacyCredit)} prepaid credit</div>}
              </div>
              <div style={{ textAlign: "right" }}>
                <span className={`qw-status ${view.policy.paused ? "is-paused" : ""}`}>
                  {view.policy.paused ? "Agent paused" : "Agent active"}
                </span>
                <div className="qw-hint" style={{ marginTop: 6 }}>
                  {usd(view.spentTodayUsd)} of {usd(view.policy.dailyUsd)} today
                </div>
                <div className="qw-meter"><div style={{ width: `${spentPct}%` }} /></div>
              </div>
            </section>

            <div className="qw-rails">
              {view.wallets.map((w) => (
                <button key={w.rail} type="button" className={`qw-rail ${active?.rail === w.rail ? "is-active" : ""}`} onClick={() => w.address && setRail(w.rail)} disabled={!w.address}>
                  <RailBadge rail={w.rail} name={w.name} />
                  <span className="qw-rail-amount">{w.usdc === null ? "-" : usd(w.usdc)}</span>
                  {!w.researchReady && w.address && <span className="qw-hint">Funding only</span>}
                </button>
              ))}
            </div>

            <nav className="qw-tabs" role="tablist">
              {(["fund", "limits", "withdraw", "activity"] as WalletTab[]).map((t) => (
                <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? "is-active" : ""} onClick={() => { setTab(t); setError(null); setNotice(null); }}>
                  {t === "fund" ? "Fund" : t === "limits" ? "Agent limits" : t === "withdraw" ? "Withdraw" : "Activity"}
                </button>
              ))}
            </nav>

            {tab === "fund" && active && (
              <section className="qw-panel">
                <CopyAddress wallet={active} />
                {active.family === "evm" ? (
                  <>
                    <AmountPicker value={amount} onChange={setAmount} />
                    <button type="button" className="qw-primary" onClick={handleFundBase} disabled={Boolean(busy)}>
                      {busy === "fund" ? "Confirm in your wallet…" : `Fund ${amount ? usd(Number(amount) || 0) : ""} from connected wallet`}
                    </button>
                    <p className="qw-hint">
                      Sends USDC on {active.name} from MetaMask, Coinbase Wallet or BO Wallet. You can also send USDC on {active.name} to the address above from the Coinbase app or any exchange. Only send USDC on {active.name}.
                    </p>
                  </>
                ) : (
                  <>
                    <AmountPicker value={amount} onChange={setAmount} />
                    <a className="qw-primary" href={solanaPayUrl(active.address!, Number(amount) || 0, env)}>
                      Open in Solana wallet
                    </a>
                    <button type="button" className="qw-secondary" onClick={handleSolanaSent} disabled={Boolean(busy)}>
                      {busy === "sol-check" ? "Watching for your deposit…" : "I've sent it. Check balance"}
                    </button>
                    <p className="qw-hint">
                      Send USDC on {active.name} from Phantom, MetaMask (Solana), Solflare or an exchange to the address above. Only send USDC on {active.name}.
                    </p>
                  </>
                )}
                <p className="qw-hint">
                  Each answer costs exactly what its sources charge (about $0.001 to $0.03) plus Qerin&apos;s {usd(view.serviceFeeUsd)} fee, paid gaslessly from this wallet.
                </p>
              </section>
            )}

            {tab === "limits" && (
              <section className="qw-panel">
                <p className="qw-hint" style={{ marginTop: 0 }}>
                  Your agent checks these before every question and won&apos;t spend outside them. Changes need your wallet signature.
                </p>
                <div className="qw-grid">
                  <label className="qw-field">
                    <span>Per question (max)</span>
                    <input inputMode="decimal" value={perQuery} onChange={(e) => setPerQuery(e.target.value.replace(/[^0-9.]/g, ""))} />
                    <small>{usd(view.policyBounds.perQueryUsd.min)}–{usd(view.policyBounds.perQueryUsd.max)}</small>
                  </label>
                  <label className="qw-field">
                    <span>Per day (max)</span>
                    <input inputMode="decimal" value={daily} onChange={(e) => setDaily(e.target.value.replace(/[^0-9.]/g, ""))} />
                    <small>{usd(view.policyBounds.dailyUsd.min)}–{usd(view.policyBounds.dailyUsd.max)}</small>
                  </label>
                </div>
                <label className="qw-toggle">
                  <input type="checkbox" checked={paused} onChange={(e) => setPaused(e.target.checked)} />
                  <span>Pause my agent (no spending at all)</span>
                </label>
                {view.feeOwedUsd > 0 && (
                  <p className="qw-hint">{usd(view.feeOwedUsd)} in fees didn&apos;t settle earlier and will be collected with your next answer.</p>
                )}
                <button type="button" className="qw-primary" onClick={handleSavePolicy} disabled={Boolean(busy)}>
                  {busy === "policy" ? "Sign in your wallet…" : "Sign & save limits"}
                </button>
              </section>
            )}

            {tab === "withdraw" && active && (
              <section className="qw-panel">
                <div className="qw-hint" style={{ marginTop: 0 }}>
                  Available on {active.name}: <b>{usd(active.usdc ?? 0)}</b> USDC
                </div>
                <AmountPicker value={withdrawAmount} onChange={setWithdrawAmount} max={active.usdc ?? 0} />
                {active.family === "evm" ? (
                  <div className="qw-field">
                    <span>To (your connected wallet)</span>
                    <code className="qw-fixed">{connectedWallet}</code>
                  </div>
                ) : (
                  <label className="qw-field">
                    <span>To Solana address</span>
                    <input value={solDestination} onChange={(e) => setSolDestination(e.target.value.trim())} placeholder="Your Phantom / Solana address" />
                  </label>
                )}
                <button type="button" className="qw-primary" onClick={handleWithdraw} disabled={Boolean(busy)}>
                  {busy === "withdraw" ? "Sign in your wallet…" : "Sign & withdraw"}
                </button>
                <p className="qw-hint">Gasless: your Qerin wallet signs and the network fee is covered. Funds can only leave with your signature.</p>
              </section>
            )}

            {tab === "activity" && (
              <section className="qw-panel">
                {view.activity.length === 0 ? (
                  <div className="qw-hint">No agent activity yet. Every payment your agent makes shows here with its on-chain proof.</div>
                ) : (
                  <ul className="qw-activity">
                    {view.activity.map((a, i) => (
                      <li key={`${a.txHash ?? a.at}-${i}`}>
                        <span className={`qw-kind is-${a.kind}`}>{a.kind === "source" ? "Source" : a.kind === "fee" ? "Fee" : "Withdraw"}</span>
                        <span className="qw-activity-label">{a.label}</span>
                        <span className="qw-activity-amount">−{usd(a.amountUsd, 3)}</span>
                        {a.explorerUrl ? <a href={a.explorerUrl} target="_blank" rel="noreferrer">tx ↗</a> : <span className="qw-hint">pending</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            <div className="qw-footer">
              <button type="button" className="qw-link" onClick={handleRefresh} disabled={Boolean(busy)}>
                {busy === "refresh" ? "Refreshing…" : "Refresh balance"}
              </button>
              <span className="qw-hint">Keys secured by Coinbase CDP · balances read on-chain</span>
            </div>
          </>
        )}

        {error && <div className="qw-error" role="alert">{error}</div>}
        {notice && (
          <div className="qw-notice" role="status">
            {notice.text} {notice.href && <a href={notice.href} target="_blank" rel="noreferrer">View transaction ↗</a>}
          </div>
        )}
      </div>

      <style>{`
        .qw-overlay { position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; background: rgba(6,8,14,0.82); backdrop-filter: blur(12px); }
        .qw-dialog { width: 100%; max-width: 500px; max-height: 92vh; overflow-y: auto; box-sizing: border-box; padding: 22px 24px; border-radius: 20px; background: linear-gradient(145deg, #111420 0%, #0d1018 100%); border: 1px solid rgba(234,88,12,0.28); box-shadow: 0 28px 70px rgba(0,0,0,0.7), 0 0 40px rgba(234,88,12,0.1); color: #F3F4F6; font-family: var(--font-inter), -apple-system, sans-serif; }
        .qw-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
        .qw-logo { width: 34px; height: 34px; flex-shrink: 0; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #EA580C 0%, #C2410C 100%); box-shadow: 0 0 14px rgba(234,88,12,0.45); }
        .qw-title { font-weight: 700; font-size: 17px; letter-spacing: -0.02em; display: flex; align-items: center; gap: 8px; }
        .qw-subtitle { margin-top: 2px; font-size: 12px; color: #9CA3AF; line-height: 1.4; }
        .qw-testnet { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #FBBF24; border: 1px solid rgba(251,191,36,0.4); border-radius: 6px; padding: 1px 6px; }
        .qw-close { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #9CA3AF; cursor: pointer; padding: 5px 9px; font-size: 13px; line-height: 1; }
        .qw-empty { font-size: 13px; color: #D1D5DB; line-height: 1.5; padding: 18px 0; }
        .qw-create h3 { margin: 0 0 10px; font-size: 15px; }
        .qw-create ul { margin: 0 0 16px; padding-left: 18px; font-size: 13px; line-height: 1.6; color: #D1D5DB; }
        .qw-summary { display: flex; justify-content: space-between; gap: 12px; padding: 14px 16px; border-radius: 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); margin-bottom: 12px; }
        .qw-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #9CA3AF; }
        .qw-total { font-family: var(--font-ibm-plex-mono), monospace; font-size: 26px; font-weight: 700; margin-top: 2px; }
        .qw-total span { font-size: 12px; color: #9CA3AF; font-weight: 500; }
        .qw-status { display: inline-block; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 99px; color: #4ADE80; background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.3); }
        .qw-status.is-paused { color: #FBBF24; background: rgba(251,191,36,0.12); border-color: rgba(251,191,36,0.3); }
        .qw-meter { margin-top: 6px; width: 140px; max-width: 100%; height: 4px; border-radius: 99px; background: rgba(255,255,255,0.08); overflow: hidden; margin-left: auto; }
        .qw-meter > div { height: 100%; background: linear-gradient(90deg, #EA580C, #FB923C); border-radius: 99px; transition: width 0.4s ease; }
        .qw-rails { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; margin-bottom: 12px; }
        .qw-rail { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; padding: 10px 12px; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); color: inherit; cursor: pointer; font: inherit; text-align: left; }
        .qw-rail.is-active { border-color: rgba(234,88,12,0.6); background: rgba(234,88,12,0.08); }
        .qw-rail:disabled { opacity: 0.5; cursor: not-allowed; }
        .qw-rail-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 99px; border: 1px solid; }
        .qw-rail-amount { font-family: var(--font-ibm-plex-mono), monospace; font-size: 15px; font-weight: 700; }
        .qw-tabs { display: flex; gap: 4px; padding: 4px; border-radius: 12px; background: rgba(255,255,255,0.04); margin-bottom: 12px; overflow-x: auto; }
        .qw-tabs button { flex: 1; white-space: nowrap; padding: 8px 10px; border: none; border-radius: 9px; background: transparent; color: #9CA3AF; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
        .qw-tabs button.is-active { background: rgba(234,88,12,0.18); color: #FDBA74; }
        .qw-panel { display: flex; flex-direction: column; gap: 10px; }
        .qw-address { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 10px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); }
        .qw-address code { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--font-ibm-plex-mono), monospace; font-size: 12px; color: #E5E7EB; }
        .qw-chip-btn { font: inherit; font-size: 11px; font-weight: 600; padding: 4px 9px; border-radius: 7px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.05); color: #E5E7EB; cursor: pointer; text-decoration: none; white-space: nowrap; }
        .qw-presets { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
        .qw-preset { flex: 1; min-width: 52px; padding: 8px 0; border-radius: 9px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); color: #E5E7EB; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
        .qw-preset.is-active { border-color: rgba(234,88,12,0.7); background: rgba(234,88,12,0.15); color: #FDBA74; }
        .qw-field { display: flex; flex-direction: column; gap: 5px; font-size: 11px; color: #9CA3AF; font-weight: 600; }
        .qw-field input { font: inherit; font-size: 15px; color: #F3F4F6; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); background: rgba(0,0,0,0.3); outline: none; font-family: var(--font-ibm-plex-mono), monospace; min-width: 0; }
        .qw-field input:focus { border-color: rgba(234,88,12,0.7); }
        .qw-field small { font-weight: 500; color: #6B7280; }
        .qw-fixed { font-family: var(--font-ibm-plex-mono), monospace; font-size: 12px; color: #E5E7EB; padding: 10px 12px; border-radius: 10px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); overflow-wrap: anywhere; }
        .qw-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .qw-toggle { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #D1D5DB; cursor: pointer; }
        .qw-toggle input { width: 16px; height: 16px; accent-color: #EA580C; }
        .qw-primary { display: block; text-align: center; text-decoration: none; width: 100%; padding: 12px 14px; border: none; border-radius: 12px; background: linear-gradient(135deg, #EA580C 0%, #C2410C 100%); color: #fff; font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 6px 20px rgba(234,88,12,0.3); box-sizing: border-box; }
        .qw-primary:disabled, .qw-secondary:disabled { opacity: 0.6; cursor: wait; }
        .qw-secondary { width: 100%; padding: 11px 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.04); color: #E5E7EB; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
        .qw-hint { font-size: 11.5px; line-height: 1.5; color: #9CA3AF; margin: 0; }
        .qw-activity { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
        .qw-activity li { display: grid; grid-template-columns: auto 1fr auto auto; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 10px; background: rgba(255,255,255,0.03); font-size: 12px; }
        .qw-activity a { color: #FDBA74; text-decoration: none; font-weight: 600; }
        .qw-activity-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #D1D5DB; }
        .qw-activity-amount { font-family: var(--font-ibm-plex-mono), monospace; font-weight: 700; }
        .qw-kind { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 6px; border-radius: 6px; }
        .qw-kind.is-source { color: #60A5FA; background: rgba(59,130,246,0.14); }
        .qw-kind.is-fee { color: #FDBA74; background: rgba(234,88,12,0.14); }
        .qw-kind.is-withdrawal { color: #C084FC; background: rgba(168,85,247,0.14); }
        .qw-footer { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 14px; flex-wrap: wrap; }
        .qw-link { background: none; border: none; padding: 0; color: #FDBA74; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
        .qw-error { margin-top: 12px; padding: 10px 12px; border-radius: 10px; font-size: 12.5px; line-height: 1.45; color: #FCA5A5; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); }
        .qw-notice { margin-top: 12px; padding: 10px 12px; border-radius: 10px; font-size: 12.5px; line-height: 1.45; color: #BBF7D0; background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.25); }
        .qw-notice a { color: #FDBA74; font-weight: 600; }
        @media (max-width: 560px) {
          .qw-overlay { padding: 0; align-items: stretch; }
          .qw-dialog { max-width: none; max-height: none; height: 100%; border-radius: 0; padding: calc(16px + env(safe-area-inset-top)) 16px calc(16px + env(safe-area-inset-bottom)); }
          .qw-grid { grid-template-columns: 1fr; }
          .qw-summary { flex-direction: column; }
          .qw-summary > div:last-child { text-align: left !important; }
          .qw-meter { margin-left: 0; }
        }
      `}</style>
    </div>
  );
}
