"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Script from "next/script";
import {
  sendCryptoDeposit,
  signTopupConfirmation,
  clearPendingTopup,
  registerAssetInWallet,
  checkWalletBalances,
  fetchBotPrice,
  TOPUP_NETWORKS,
  type TopupNetwork,
  type WalletBalanceReport,
} from "@/lib/cryptoTopup";
import { confirmCryptoTopup, claimDemoFuel, fetchAccountInfo, requestWalletConnection, getOrCreateAccountId, fetchBalance, getInjectedProvider } from "@/lib/account";

const TIERS = [
  { amountUsd: 1,  title: "Explorer Fuel",      desc: "~50 Queries",               badge: null },
  { amountUsd: 5,  title: "Intelligence Pack",   desc: "~250 Queries · Multi-Source", badge: "RECOMMENDED" },
  { amountUsd: 20, title: "Institutional Vault", desc: "~1,000 Queries · Priority",  badge: null },
];

// Public sitekey — pairs with the secret held only by the deployed
// siteverify Worker (see apps/frontend/src/app/api/account/topup/demo-claim/route.ts).
const TURNSTILE_SITEKEY = "0x4AAAAAAEwCEYi80lvHdDWk";

const NOT_MINED_REASON = "not found on-chain yet";
const CONFIRM_RETRY_INTERVAL_MS = 3000;
const CONFIRM_MAX_ATTEMPTS = 10;

type Step =
  | { kind: "idle" }
  | { kind: "claiming" }
  | { kind: "connecting" }
  | { kind: "sending"; amountUsd: number; network: TopupNetwork; paymentMethod: "token" | "native" }
  | { kind: "confirming"; txHash: string; amountUsd: number; attempt: number; network: TopupNetwork }
  | { kind: "success"; balance: number; txHash?: string; message?: string }
  | { kind: "stuck"; txHash: string; amountUsd: number; reason: string; network: TopupNetwork }
  | { kind: "error"; message: string };

function explorerUrl(txHash: string, network: TopupNetwork): string {
  return network === "botchain"
    ? `https://scan.botchain.ai/tx/${txHash}`
    : `https://basescan.org/tx/${txHash}`;
}

function shortHash(txHash: string): string {
  return `${txHash.slice(0, 8)}…${txHash.slice(-6)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function TopupModal({
  accountId: initialAccountId,
  initialNetwork = "base",
  onClose,
  onCredited,
  reason,
  onAccountCreated,
}: {
  accountId: string;
  initialNetwork?: "base" | "botchain";
  onClose: () => void;
  onCredited: (balance: number) => void;
  reason?: string | null;
  onAccountCreated?: (accountId: string, balance: number) => void;
}) {
  const [accountId, setAccountId] = useState(initialAccountId);
  const [network, setNetwork] = useState<TopupNetwork>(initialNetwork);
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const [walletDiag, setWalletDiag] = useState<WalletBalanceReport | null>(null);
  const [watchAssetSuccess, setWatchAssetSuccess] = useState<boolean | null>(null);
  const [passClaimed, setPassClaimed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem(`qerin_pass_claimed_${initialAccountId}`) === "true";
    }
    return false;
  });
  const [botPrice, setBotPrice] = useState<number>(12.20);
  const [hasWallet, setHasWallet] = useState<boolean | null>(() => {
    if (typeof window === "undefined") return null;
    return getInjectedProvider() !== null;
  });
  const [paymentMethod, setPaymentMethod] = useState<"token" | "native">(
    initialNetwork === "botchain" ? "native" : "token"
  );
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReady, setTurnstileReady] = useState(false);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);

  const activeMeta = TOPUP_NETWORKS[network];

  // Render the Turnstile widget imperatively once the script is loaded and
  // the pass hasn't been claimed — bot-gates the free $1.50 claim so it
  // can't be farmed by scripting requests directly at the API route.
  useEffect(() => {
    if (!turnstileReady || passClaimed || !turnstileContainerRef.current) return;
    const w = window as unknown as {
      turnstile?: {
        render: (el: Element, opts: Record<string, unknown>) => string;
        remove: (id: string) => void;
        reset: (id: string) => void;
      };
    };
    if (!w.turnstile) return;
    const id = w.turnstile.render(turnstileContainerRef.current, {
      sitekey: TURNSTILE_SITEKEY,
      action: "turnstile-spin-v1",
      callback: (token: string) => setTurnstileToken(token),
      "expired-callback": () => setTurnstileToken(""),
      "error-callback": () => setTurnstileToken(""),
    });
    turnstileWidgetIdRef.current = id;
    return () => {
      try {
        w.turnstile?.remove(id);
      } catch {}
      turnstileWidgetIdRef.current = null;
    };
  }, [turnstileReady, passClaimed]);

  // Detect wallet after mount if injected asynchronously
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasWallet(getInjectedProvider() !== null);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleSelectNetwork = useCallback((net: TopupNetwork) => {
    setNetwork(net);
    setPaymentMethod(net === "botchain" ? "native" : "token");
    setStep({ kind: "idle" });
  }, []);

  // Fetch live BOT price
  useEffect(() => {
    if (network === "botchain") {
      fetchBotPrice().then(setBotPrice).catch(() => setBotPrice(12.20));
    }
  }, [network]);

  useEffect(() => {
    let cancelled = false;

    async function checkAccountPass() {
      if (!accountId) return;
      try {
        const info = await fetchAccountInfo(accountId);
        if (!cancelled && info.passClaimed) {
          setPassClaimed(true);
          if (typeof window !== "undefined") {
            window.localStorage.setItem(`qerin_pass_claimed_${accountId}`, "true");
          }
        }
      } catch {}
    }
    checkAccountPass();

    return () => { cancelled = true; };
  }, [accountId]);

  useEffect(() => {
    let cancelled = false;
    async function inspect() {
      if (!hasWallet) return;
      try {
        const rep = await checkWalletBalances(network);
        if (!cancelled) {
          setWalletDiag(rep);
          if (rep.botPrice) setBotPrice(rep.botPrice);
        }
      } catch {
        if (!cancelled) setWalletDiag(null);
      }
    }
    inspect();
    return () => { cancelled = true; };
  }, [network, hasWallet]);

  const busy = step.kind === "sending" || step.kind === "confirming" || step.kind === "claiming" || step.kind === "connecting";

  const runConfirm = useCallback(async (txHash: string, amountUsd: number, net: TopupNetwork) => {
    let signature: string;
    try {
      signature = await signTopupConfirmation(accountId, txHash);
    } catch (err) {
      setStep({
        kind: "stuck",
        txHash,
        amountUsd,
        network: net,
        reason: err instanceof Error ? err.message : "Could not sign the confirmation message",
      });
      return;
    }

    for (let attempt = 1; attempt <= CONFIRM_MAX_ATTEMPTS; attempt++) {
      setStep({ kind: "confirming", txHash, amountUsd, attempt, network: net });
      try {
        const balance = await confirmCryptoTopup(accountId, txHash, signature, net === "botchain" ? "botchain" : "mainnet");
        clearPendingTopup(accountId);
        setStep({ kind: "success", balance, txHash });
        onCredited(balance);
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not confirm deposit";
        const notMinedYet = message.toLowerCase().includes(NOT_MINED_REASON);
        if (notMinedYet && attempt < CONFIRM_MAX_ATTEMPTS) {
          await sleep(CONFIRM_RETRY_INTERVAL_MS);
          continue;
        }
        setStep({ kind: "stuck", txHash, amountUsd, network: net, reason: message });
        return;
      }
    }
  }, [accountId, onCredited]);

  const handleConnectWallet = async () => {
    setStep({ kind: "connecting" });
    try {
      const addr = await requestWalletConnection();
      if (addr) {
        const id = await getOrCreateAccountId(addr);
        setAccountId(id);
        const b = await fetchBalance(id);
        onAccountCreated?.(id, b);
        // Re-check wallet diag after connect
        setHasWallet(true);
        try {
          const rep = await checkWalletBalances(network);
          setWalletDiag(rep);
          if (rep.botPrice) setBotPrice(rep.botPrice);
        } catch {}
      }
      setStep({ kind: "idle" });
    } catch (err) {
      setStep({
        kind: "error",
        message: err instanceof Error ? err.message : "Could not connect wallet",
      });
    }
  };

  const handleWalletDeposit = async (amountUsd: number) => {
    setStep({ kind: "sending", amountUsd, network, paymentMethod });
    let txHash: string;
    try {
      txHash = await sendCryptoDeposit(accountId, amountUsd, network, paymentMethod);
    } catch (err) {
      setStep({
        kind: "error",
        message: err instanceof Error ? err.message : "Could not initialize settlement transaction",
      });
      return;
    }
    await runConfirm(txHash, amountUsd, network);
  };

  const resetTurnstile = () => {
    const w = window as unknown as { turnstile?: { reset: (id: string) => void } };
    if (turnstileWidgetIdRef.current && w.turnstile) {
      try {
        w.turnstile.reset(turnstileWidgetIdRef.current);
      } catch {}
    }
    setTurnstileToken("");
  };

  const handleClaimDemoFuel = async () => {
    if (passClaimed) {
      setStep({
        kind: "error",
        message: "Ecosystem Review Pass has already been claimed for this account.",
      });
      return;
    }
    if (!turnstileToken) {
      setStep({ kind: "error", message: "Complete the verification challenge above to claim the pass." });
      return;
    }

    setStep({ kind: "claiming" });
    try {
      const balance = await claimDemoFuel(accountId, turnstileToken);
      setPassClaimed(true);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(`qerin_pass_claimed_${accountId}`, "true");
      }
      setStep({ kind: "success", balance, message: "Ecosystem Review Pass activated — $1.50 Research Fuel credited." });
      onCredited(balance);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not activate review pass";
      if (msg.toLowerCase().includes("already been claimed")) {
        setPassClaimed(true);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(`qerin_pass_claimed_${accountId}`, "true");
        }
      }
      resetTurnstile();
      setStep({ kind: "error", message: msg });
    }
  };

  const handleRegisterToken = async () => {
    const ok = await registerAssetInWallet(network);
    setWatchAssetSuccess(ok);
    setTimeout(() => setWatchAssetSuccess(null), 4000);
  };

  const canDismiss = !busy;

  // Calculate amounts for display
  const botNeededByTier = TIERS.reduce<Record<number, string>>((acc, t) => {
    acc[t.amountUsd] = (t.amountUsd / botPrice).toFixed(4);
    return acc;
  }, {});

  return (
    <>
    <Script
      src="https://challenges.cloudflare.com/turnstile/v0/api.js"
      strategy="afterInteractive"
      onLoad={() => setTurnstileReady(true)}
    />
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(6, 8, 14, 0.82)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
        boxSizing: "border-box",
      }}
      onClick={canDismiss ? onClose : undefined}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
          background: "linear-gradient(145deg, #111420 0%, #0d1018 100%)",
          border: "1px solid rgba(234, 88, 12, 0.28)",
          borderRadius: 20,
          padding: "22px 24px",
          boxSizing: "border-box",
          boxShadow: "0 28px 70px rgba(0,0,0,0.7), 0 0 40px rgba(234,88,12,0.1)",
          color: "#F3F4F6",
          fontFamily: "var(--font-inter), -apple-system, sans-serif",
          maxHeight: "92vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "linear-gradient(135deg, #EA580C 0%, #C2410C 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 14px rgba(234,88,12,0.45)",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em" }}>Agent Settlement Treasury</div>
              {reason && <div style={{ marginTop: 2, fontSize: 12, color: "#9CA3AF" }}>{reason}</div>}
            </div>
          </div>
          {canDismiss && (
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                color: "#9CA3AF",
                cursor: "pointer",
                padding: "5px 9px",
                fontSize: 13,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Wallet Not Detected */}
        {hasWallet === false && step.kind !== "connecting" && (
          <div
            style={{
              marginBottom: 14,
              padding: "12px 14px",
              background: "rgba(251, 146, 60, 0.08)",
              border: "1px solid rgba(251,146,60,0.3)",
              borderRadius: 10,
              fontSize: 12.5,
              color: "#FCD34D",
            }}
          >
            ⚠ No Web3 wallet detected. Install{" "}
            <a href="https://metamask.io" target="_blank" rel="noreferrer" style={{ color: "#FB923C" }}>MetaMask</a>,{" "}
            <a href="https://www.okx.com/web3" target="_blank" rel="noreferrer" style={{ color: "#FB923C" }}>OKX Wallet</a>, or{" "}
            <a href="https://web3.bitget.com" target="_blank" rel="noreferrer" style={{ color: "#FB923C" }}>Bitget Wallet</a>.
          </div>
        )}

        {/* Connect Wallet Prompt (wallet exists but not connected) */}
        {hasWallet && !walletDiag && step.kind !== "connecting" && (
          <button
            onClick={handleConnectWallet}
            style={{
              width: "100%",
              marginBottom: 14,
              padding: "11px 16px",
              background: "linear-gradient(135deg, rgba(234,88,12,0.18) 0%, rgba(194,65,12,0.12) 100%)",
              border: "1px solid rgba(234,88,12,0.45)",
              borderRadius: 10,
              color: "#FB923C",
              fontWeight: 700,
              fontSize: 13.5,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <span>🔗</span> Connect Wallet to Pay
          </button>
        )}

        {/* Connecting state */}
        {step.kind === "connecting" && (
          <div style={{ textAlign: "center", padding: "14px 0 18px", fontSize: 13.5, color: "#FB923C", fontWeight: 600 }}>
            Awaiting wallet approval…
          </div>
        )}

        {/* Network Selector */}
        <div
          style={{
            display: "flex",
            background: "#09090f",
            padding: 4,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.06)",
            gap: 4,
            marginBottom: 14,
          }}
        >
          <button
            onClick={() => handleSelectNetwork("base")}
            style={{
              flex: 1,
              padding: "7px 10px",
              borderRadius: 7,
              border: "none",
              background: network === "base" ? "rgba(0,82,255,0.2)" : "transparent",
              color: network === "base" ? "#60A5FA" : "#6B7280",
              fontWeight: network === "base" ? 700 : 500,
              fontSize: 12,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              transition: "all 0.15s ease",
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#0052FF", display: "inline-block" }} />
            Base (USDC)
          </button>
          <button
            onClick={() => handleSelectNetwork("botchain")}
            style={{
              flex: 1,
              padding: "7px 10px",
              borderRadius: 7,
              border: "none",
              background: network === "botchain" ? "rgba(234,88,12,0.2)" : "transparent",
              color: network === "botchain" ? "#FB923C" : "#6B7280",
              fontWeight: network === "botchain" ? 700 : 500,
              fontSize: 12,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              transition: "all 0.15s ease",
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#EA580C", display: "inline-block" }} />
            BOT Chain
          </button>
        </div>

        {/* Connected Wallet Balances */}
        {walletDiag && (
          <div
            style={{
              marginBottom: 12,
              padding: "9px 13px",
              background: "rgba(255,255,255,0.03)",
              borderRadius: 9,
              border: "1px solid rgba(255,255,255,0.07)",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#6B7280" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
              <span style={{ fontFamily: "monospace", color: "#D1D5DB" }}>
                {walletDiag.account.slice(0, 6)}…{walletDiag.account.slice(-4)}
              </span>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span style={{ color: Number(walletDiag.nativeBalance) > 0 ? "#34D399" : "#F87171", fontWeight: 600 }}>
                {walletDiag.nativeBalance} {activeMeta.currency}
              </span>
              {network === "base" && (
                <span style={{ color: Number(walletDiag.tokenBalance) > 0 ? "#60A5FA" : "#F87171" }}>
                  {walletDiag.tokenBalance} USDC
                </span>
              )}
            </div>
          </div>
        )}

        {/* Payment Method Selector — BOT Chain only */}
        {network === "botchain" && (
          <div
            style={{
              marginBottom: 14,
              display: "flex",
              background: "#09090f",
              padding: 3,
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.05)",
              gap: 3,
            }}
          >
            <button
              onClick={() => setPaymentMethod("native")}
              style={{
                flex: 1,
                padding: "6px 8px",
                borderRadius: 6,
                border: "none",
                background: paymentMethod === "native" ? "rgba(234,88,12,0.25)" : "transparent",
                color: paymentMethod === "native" ? "#FB923C" : "#6B7280",
                fontWeight: paymentMethod === "native" ? 700 : 500,
                fontSize: 11.5,
                cursor: "pointer",
              }}
            >
              ⚡ Pay with BOT
            </button>
            <button
              onClick={() => setPaymentMethod("token")}
              style={{
                flex: 1,
                padding: "6px 8px",
                borderRadius: 6,
                border: "none",
                background: paymentMethod === "token" ? "rgba(100,116,139,0.2)" : "transparent",
                color: paymentMethod === "token" ? "#CBD5E1" : "#6B7280",
                fontWeight: paymentMethod === "token" ? 600 : 500,
                fontSize: 11.5,
                cursor: "pointer",
              }}
            >
              💵 Pay with USDT
            </button>
          </div>
        )}

        {/* Main Selection Screen */}
        {(step.kind === "idle" || step.kind === "error") && (
          <>
            {/* Error Banner */}
            {step.kind === "error" && (
              <div
                style={{
                  marginBottom: 12,
                  padding: "11px 13px",
                  borderRadius: 9,
                  background: "rgba(239,68,68,0.09)",
                  border: "1px solid rgba(239,68,68,0.28)",
                  fontSize: 12.5,
                  color: "#FCA5A5",
                }}
              >
                {step.message}
              </div>
            )}

            {/* Free Ecosystem Pass */}
            <div
              style={{
                marginBottom: 12,
                padding: "12px 14px",
                background: passClaimed
                  ? "rgba(255,255,255,0.03)"
                  : "linear-gradient(135deg, rgba(20,184,166,0.14) 0%, rgba(13,148,136,0.07) 100%)",
                border: passClaimed
                  ? "1px solid rgba(255,255,255,0.08)"
                  : "1px solid rgba(20,184,166,0.38)",
                borderRadius: 11,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                opacity: passClaimed ? 0.7 : 1,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: passClaimed ? "#9CA3AF" : "#2DD4BF", display: "flex", alignItems: "center", gap: 5 }}>
                  <span>{passClaimed ? "✓" : "⚡"}</span>
                  Ecosystem Review Pass {passClaimed ? "(Claimed)" : "(Free — $1.50)"}
                </div>
                <div style={{ marginTop: 2, fontSize: 11.5, color: passClaimed ? "#4B5563" : "#99F6E4" }}>
                  {passClaimed ? "Already activated for this account." : "One-time pass — test autonomous research for free."}
                </div>
                {!passClaimed && (
                  <div ref={turnstileContainerRef} style={{ marginTop: 8 }} />
                )}
              </div>
              <button
                onClick={handleClaimDemoFuel}
                disabled={passClaimed || busy || !turnstileToken}
                style={{
                  background: passClaimed || !turnstileToken ? "rgba(255,255,255,0.05)" : "#0D9488",
                  border: passClaimed || !turnstileToken ? "1px solid rgba(255,255,255,0.1)" : "none",
                  color: passClaimed || !turnstileToken ? "#6B7280" : "#fff",
                  fontWeight: 700,
                  fontSize: 12,
                  padding: "7px 14px",
                  borderRadius: 7,
                  cursor: passClaimed || !turnstileToken ? "default" : "pointer",
                  boxShadow: passClaimed || !turnstileToken ? "none" : "0 0 12px rgba(20,184,166,0.35)",
                  flexShrink: 0,
                }}
              >
                {passClaimed ? "✓ Claimed" : "Claim"}
              </button>
            </div>

            {/* Tier Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {TIERS.map((tier) => {
                const botAmt = botNeededByTier[tier.amountUsd];
                const isBotNative = network === "botchain" && paymentMethod === "native";
                return (
                  <div
                    key={tier.amountUsd}
                    style={{
                      padding: "13px 15px",
                      background: tier.badge ? "rgba(234,88,12,0.07)" : "#131620",
                      border: tier.badge
                        ? "1px solid rgba(234,88,12,0.45)"
                        : "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 11,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>{tier.title}</span>
                          {tier.badge && (
                            <span
                              style={{
                                fontSize: 9.5,
                                fontWeight: 700,
                                color: "#EA580C",
                                background: "rgba(234,88,12,0.14)",
                                padding: "2px 6px",
                                borderRadius: 5,
                                letterSpacing: "0.04em",
                              }}
                            >
                              {tier.badge}
                            </span>
                          )}
                        </div>
                        <div style={{ marginTop: 2, fontSize: 11.5, color: "#6B7280" }}>{tier.desc}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        {isBotNative ? (
                          <>
                            <div style={{ fontWeight: 700, fontSize: 14, color: "#FB923C" }}>{botAmt} BOT</div>
                            <div style={{ fontSize: 10.5, color: "#6B7280" }}>${tier.amountUsd}.00</div>
                          </>
                        ) : (
                          <div style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>${tier.amountUsd}.00</div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleWalletDeposit(tier.amountUsd)}
                      disabled={busy || !hasWallet}
                      style={{
                        width: "100%",
                        padding: "9px 14px",
                        background: busy || !hasWallet ? "rgba(234,88,12,0.15)" : "#EA580C",
                        border: "none",
                        borderRadius: 8,
                        color: busy || !hasWallet ? "#9CA3AF" : "#fff",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: busy || !hasWallet ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 7,
                        boxShadow: busy || !hasWallet ? "none" : "0 0 12px rgba(234,88,12,0.3)",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {isBotNative ? (
                        <><span>⚡</span> Pay {botAmt} BOT</>
                      ) : (
                        <><span>💳</span> Pay ${tier.amountUsd}.00 {network === "base" ? "USDC" : "USDT"}</>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Token Register Helper */}
            {walletDiag && network === "base" && (
              <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 10 }}>
                <button
                  onClick={handleRegisterToken}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#6B7280",
                    fontSize: 11.5,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: 0,
                  }}
                >
                  <span>🦊</span> Add USDC to wallet
                  {watchAssetSuccess !== null && (
                    <span style={{ color: watchAssetSuccess ? "#34D399" : "#F87171", marginLeft: 4 }}>
                      {watchAssetSuccess ? "✓ Added" : "✗ Failed"}
                    </span>
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {/* Claiming State */}
        {step.kind === "claiming" && (
          <div style={{ marginTop: 20, textAlign: "center", padding: "14px 0" }}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>⚡</div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Activating Research Fuel…</div>
          </div>
        )}

        {/* Sending State */}
        {step.kind === "sending" && (
          <div style={{ marginTop: 20, textAlign: "center", padding: "14px 0" }}>
            <div
              style={{
                width: 34,
                height: 34,
                margin: "0 auto 12px",
                border: "3px solid rgba(234,88,12,0.2)",
                borderTopColor: "#EA580C",
                borderRadius: "50%",
                animation: "qerin-spin 0.8s linear infinite",
              }}
            />
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              {step.paymentMethod === "native" && step.network === "botchain"
                ? `Sending ${(step.amountUsd / botPrice).toFixed(4)} BOT…`
                : `Sending $${step.amountUsd}.00 ${step.network === "base" ? "USDC" : "USDT"}…`}
            </div>
            <div style={{ marginTop: 5, fontSize: 12, color: "#6B7280" }}>
              Awaiting wallet signature on {activeMeta.name}
            </div>
          </div>
        )}

        {/* Confirming State */}
        {step.kind === "confirming" && (
          <div style={{ marginTop: 20, textAlign: "center", padding: "14px 0" }}>
            <div
              style={{
                width: 34,
                height: 34,
                margin: "0 auto 12px",
                border: "3px solid rgba(234,88,12,0.2)",
                borderTopColor: "#EA580C",
                borderRadius: "50%",
                animation: "qerin-spin 0.8s linear infinite",
              }}
            />
            <div style={{ fontWeight: 700, fontSize: 14 }}>Verifying on {activeMeta.name}…</div>
            <div style={{ marginTop: 4, fontSize: 11.5, color: "#6B7280" }}>
              Attempt {step.attempt}/{CONFIRM_MAX_ATTEMPTS}
            </div>
            <a
              href={explorerUrl(step.txHash, step.network)}
              target="_blank"
              rel="noreferrer"
              style={{ display: "inline-block", marginTop: 10, fontSize: 12, color: "#EA580C", textDecoration: "none" }}
            >
              {shortHash(step.txHash)} — View on Explorer ↗
            </a>
          </div>
        )}

        {/* Success State */}
        {step.kind === "success" && (
          <div style={{ marginTop: 20, textAlign: "center", padding: "14px 0" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(16,185,129,0.14)",
                border: "1px solid rgba(16,185,129,0.38)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 10px",
                color: "#10B981",
                fontSize: 20,
              }}
            >
              ✓
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#fff" }}>Treasury Funded</div>
            <div style={{ marginTop: 4, fontSize: 13, color: "#34D399" }}>
              Balance: ${step.balance.toFixed(2)} Fuel
            </div>
            {step.message && <div style={{ marginTop: 4, fontSize: 12, color: "#6B7280" }}>{step.message}</div>}
            {step.txHash && (
              <a
                href={explorerUrl(step.txHash, network)}
                target="_blank"
                rel="noreferrer"
                style={{ display: "inline-block", marginTop: 8, fontSize: 12, color: "#EA580C", textDecoration: "none" }}
              >
                {shortHash(step.txHash)} — View On-Chain ↗
              </a>
            )}
          </div>
        )}

        {/* Stuck State */}
        {step.kind === "stuck" && (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "#F87171" }}>Deposit sent — awaiting confirmation</div>
            <div style={{ marginTop: 5, fontSize: 12, color: "#9CA3AF" }}>{step.reason}</div>
            <a
              href={explorerUrl(step.txHash, step.network)}
              target="_blank"
              rel="noreferrer"
              style={{ display: "block", marginTop: 8, fontSize: 12, color: "#EA580C" }}
            >
              {shortHash(step.txHash)} — View on Explorer ↗
            </a>
          </div>
        )}

        {/* Dismiss Button */}
        {canDismiss && (
          <button
            onClick={onClose}
            style={{
              marginTop: 16,
              width: "100%",
              height: 40,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 9,
              fontWeight: 500,
              fontSize: 13,
              color: "#6B7280",
              cursor: "pointer",
            }}
          >
            {step.kind === "success" ? "Done" : "Close"}
          </button>
        )}
      </div>

      <style>{`
        @keyframes qerin-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
    </>
  );
}
