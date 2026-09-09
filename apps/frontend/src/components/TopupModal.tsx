"use client";

import { useEffect, useState } from "react";
import {
  sendCryptoDeposit,
  signTopupConfirmation,
  getPendingTopup,
  clearPendingTopup,
  registerAssetInWallet,
  checkWalletBalances,
  TOPUP_NETWORKS,
  type PendingTopup,
  type TopupNetwork,
  type WalletBalanceReport,
} from "@/lib/cryptoTopup";
import { confirmCryptoTopup, claimDemoFuel } from "@/lib/account";

const TIERS = [
  {
    amountUsd: 1,
    title: "Explorer Fuel",
    desc: "~50 Autonomous Micropayments",
    badge: null,
  },
  {
    amountUsd: 5,
    title: "Intelligence Pack",
    desc: "~250 Queries • Multi-Source Synthesis",
    badge: "RECOMMENDED",
  },
  {
    amountUsd: 20,
    title: "Institutional Vault",
    desc: "~1,000 Queries • Priority Settlement",
    badge: null,
  },
];

const NOT_MINED_REASON = "not found on-chain yet";
const CONFIRM_RETRY_INTERVAL_MS = 3000;
const CONFIRM_MAX_ATTEMPTS = 10;

type Step =
  | { kind: "idle" }
  | { kind: "claiming" }
  | { kind: "sending"; amountUsd: number; network: TopupNetwork }
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
  accountId,
  initialNetwork = "base",
  onClose,
  onCredited,
  reason,
}: {
  accountId: string;
  initialNetwork?: "base" | "botchain";
  onClose: () => void;
  onCredited: (balance: number) => void;
  reason?: string | null;
}) {
  const [network, setNetwork] = useState<TopupNetwork>(initialNetwork);
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const [pending, setPending] = useState<PendingTopup | null>(null);
  const [walletDiag, setWalletDiag] = useState<WalletBalanceReport | null>(null);
  const [isCheckingWallet, setIsCheckingWallet] = useState(false);
  const [watchAssetSuccess, setWatchAssetSuccess] = useState<boolean | null>(null);
  const [showMetaMaskHelp, setShowMetaMaskHelp] = useState(false);

  const activeMeta = TOPUP_NETWORKS[network];

  // Check pending recovery payment
  useEffect(() => {
    setPending(getPendingTopup(accountId));
  }, [accountId]);

  // Inspect connected wallet balance for chosen network
  useEffect(() => {
    let cancelled = false;
    async function inspect() {
      if (typeof window === "undefined" || !window.ethereum) return;
      setIsCheckingWallet(true);
      try {
        const rep = await checkWalletBalances(network);
        if (!cancelled) setWalletDiag(rep);
      } catch {
        if (!cancelled) setWalletDiag(null);
      } finally {
        if (!cancelled) setIsCheckingWallet(false);
      }
    }
    inspect();
    return () => {
      cancelled = true;
    };
  }, [network]);

  const busy = step.kind === "sending" || step.kind === "confirming" || step.kind === "claiming";

  const runConfirm = async (txHash: string, amountUsd: number, net: TopupNetwork) => {
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
        const balance = await confirmCryptoTopup(accountId, txHash, signature);
        clearPendingTopup(accountId);
        setPending(null);
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
  };

  const onPickTier = async (amountUsd: number) => {
    setStep({ kind: "sending", amountUsd, network });
    let txHash: string;
    try {
      txHash = await sendCryptoDeposit(accountId, amountUsd, network, "token");
    } catch (err) {
      setStep({
        kind: "error",
        message: err instanceof Error ? err.message : "Could not initialize settlement transaction",
      });
      return;
    }
    setPending({ txHash, amountUsd, network, sentAt: Date.now() });
    await runConfirm(txHash, amountUsd, network);
  };

  const onResumePending = async (record: PendingTopup) => {
    const net = record.network || network;
    await runConfirm(record.txHash, record.amountUsd, net);
  };

  const handleClaimDemoFuel = async () => {
    setStep({ kind: "claiming" });
    try {
      const balance = await claimDemoFuel(accountId);
      setStep({
        kind: "success",
        balance,
        message: "Ecosystem Review Pass activated with $1.50 Research Fuel.",
      });
      onCredited(balance);
    } catch (err) {
      setStep({
        kind: "error",
        message: err instanceof Error ? err.message : "Could not activate ecosystem pass",
      });
    }
  };

  const handleRegisterToken = async () => {
    const ok = await registerAssetInWallet(network);
    setWatchAssetSuccess(ok);
    setTimeout(() => setWatchAssetSuccess(null), 4000);
  };

  const canDismiss = !busy;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10, 12, 16, 0.75)",
        backdropFilter: "blur(10px)",
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
          maxWidth: 540,
          background: "#141721",
          border: "1px solid rgba(234, 88, 12, 0.3)",
          borderRadius: 20,
          padding: "26px 28px",
          boxSizing: "border-box",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.6), 0 0 30px rgba(234, 88, 12, 0.12)",
          color: "#F3F4F6",
          fontFamily: "var(--font-inter), -apple-system, sans-serif",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Modal Top Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: "linear-gradient(135deg, #EA580C 0%, #C2410C 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 12px rgba(234, 88, 12, 0.4)",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <div style={{ fontWeight: 700, fontSize: 19, letterSpacing: "-0.02em" }}>
                Agent Settlement Treasury
              </div>
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: "#9CA3AF", lineHeight: 1.45 }}>
              {reason ??
                "Fund your autonomous treasury to pay Web3 data sources (Messari, Dune, CoinGecko, BOT Chain) and mint verifiable on-chain receipts."}
            </div>
          </div>
          {canDismiss && (
            <button
              onClick={onClose}
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 8,
                color: "#9CA3AF",
                cursor: "pointer",
                padding: "6px 10px",
                fontSize: 13,
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Network Selection Pill Bar */}
        <div
          style={{
            marginTop: 18,
            display: "flex",
            background: "#0D0F16",
            padding: 4,
            borderRadius: 12,
            border: "1px solid rgba(255, 255, 255, 0.06)",
            gap: 4,
          }}
        >
          <button
            onClick={() => setNetwork("base")}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 8,
              border: "none",
              background: network === "base" ? "rgba(0, 82, 255, 0.2)" : "transparent",
              color: network === "base" ? "#60A5FA" : "#9CA3AF",
              fontWeight: network === "base" ? 600 : 500,
              fontSize: 12.5,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              transition: "all 0.15s ease",
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#0052FF" }} />
            Base Mainnet (USDC)
          </button>
          <button
            onClick={() => setNetwork("botchain")}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 8,
              border: "none",
              background: network === "botchain" ? "rgba(234, 88, 12, 0.2)" : "transparent",
              color: network === "botchain" ? "#FB923C" : "#9CA3AF",
              fontWeight: network === "botchain" ? 600 : 500,
              fontSize: 12.5,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              transition: "all 0.15s ease",
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#EA580C" }} />
            BOT Chain (USDT/BOT)
          </button>
        </div>

        {/* Connected Wallet Diagnostics Card */}
        {walletDiag && (
          <div
            style={{
              marginTop: 14,
              padding: "10px 14px",
              background: "rgba(255, 255, 255, 0.03)",
              borderRadius: 10,
              border: "1px solid rgba(255, 255, 255, 0.08)",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "#9CA3AF" }}>Connected:</span>
              <span style={{ fontFamily: "monospace", color: "#E5E7EB" }}>
                {walletDiag.account.slice(0, 6)}…{walletDiag.account.slice(-4)}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: Number(walletDiag.tokenBalance) > 0 ? "#34D399" : "#F87171" }}>
                {walletDiag.tokenBalance} {activeMeta.tokenSymbol}
              </span>
              <span style={{ color: "#6B7280" }}>•</span>
              <span style={{ color: Number(walletDiag.nativeBalance) > 0 ? "#E5E7EB" : "#F87171" }}>
                {walletDiag.nativeBalance} {activeMeta.currency}
              </span>
            </div>
          </div>
        )}

        {/* Low Balance Warning / Helper Banner */}
        {walletDiag && Number(walletDiag.tokenBalance) < 1 && step.kind === "idle" && (
          <div
            style={{
              marginTop: 10,
              padding: "10px 12px",
              borderRadius: 10,
              background: "rgba(234, 88, 12, 0.08)",
              border: "1px solid rgba(234, 88, 12, 0.25)",
              fontSize: 12,
              color: "#FED7AA",
              lineHeight: 1.4,
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            <span>💡</span>
            <div>
              <strong>Empty or New Wallet Detected:</strong> Your wallet holds 0 {activeMeta.tokenSymbol} on {activeMeta.name}. To test Qerin immediately without sending mainnet crypto, claim the <strong>1-Click Review Pass</strong> below!
            </div>
          </div>
        )}

        {/* Pending payment recovery */}
        {pending && step.kind === "idle" && (
          <div
            style={{
              marginTop: 14,
              padding: 14,
              borderRadius: 10,
              border: "1px solid #EA580C",
              background: "rgba(234, 88, 12, 0.1)",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: "#FFFFFF" }}>
              ${pending.amountUsd} payment awaiting confirmation
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: "#9CA3AF" }}>
              Transaction was broadcast on-chain — resume to finalize settlement.
            </div>
            <button
              onClick={() => onResumePending(pending)}
              style={{
                marginTop: 10,
                height: 38,
                width: "100%",
                background: "#EA580C",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 13,
                color: "#FFFFFF",
                cursor: "pointer",
              }}
            >
              Resume Confirmation
            </button>
          </div>
        )}

        {/* Main Selection Screen */}
        {(step.kind === "idle" || step.kind === "error") && (
          <>
            {/* Tiers List */}
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {TIERS.map((tier) => (
                <div
                  key={tier.amountUsd}
                  onClick={() => onPickTier(tier.amountUsd)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 16px",
                    background: tier.badge ? "rgba(234, 88, 12, 0.08)" : "#181B26",
                    border: tier.badge
                      ? "1px solid rgba(234, 88, 12, 0.5)"
                      : "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 12,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 14.5, color: "#FFFFFF" }}>
                        {tier.title}
                      </span>
                      {tier.badge && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: "#EA580C",
                            background: "rgba(234, 88, 12, 0.15)",
                            padding: "2px 6px",
                            borderRadius: 6,
                            letterSpacing: "0.04em",
                          }}
                        >
                          {tier.badge}
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: 3, fontSize: 12, color: "#9CA3AF" }}>
                      {tier.desc}
                    </div>
                  </div>
                  <div
                    style={{
                      background: tier.badge ? "#EA580C" : "rgba(255, 255, 255, 0.08)",
                      color: "#FFFFFF",
                      padding: "8px 14px",
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: 14,
                      boxShadow: tier.badge ? "0 0 12px rgba(234, 88, 12, 0.3)" : "none",
                    }}
                  >
                    ${tier.amountUsd}.00
                  </div>
                </div>
              ))}
            </div>

            {/* 1-Click Instant Demo Voucher */}
            <div
              style={{
                marginTop: 14,
                padding: "14px 16px",
                background: "linear-gradient(135deg, rgba(20, 184, 166, 0.12) 0%, rgba(13, 148, 136, 0.06) 100%)",
                border: "1px solid rgba(20, 184, 166, 0.3)",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 13.5, color: "#2DD4BF" }}>
                  <span>⚡</span> Ecosystem Review Pass (Free)
                </div>
                <div style={{ marginTop: 2, fontSize: 11.5, color: "#99F6E4" }}>
                  1-Click demo fuel (+$1.50) for testing autonomous queries without gas
                </div>
              </div>
              <button
                onClick={handleClaimDemoFuel}
                style={{
                  background: "#0D9488",
                  border: "none",
                  color: "#FFFFFF",
                  fontWeight: 600,
                  fontSize: 12.5,
                  padding: "8px 14px",
                  borderRadius: 8,
                  cursor: "pointer",
                  boxShadow: "0 0 10px rgba(20, 184, 166, 0.3)",
                }}
              >
                Claim Pass
              </button>
            </div>

            {/* Error banner */}
            {step.kind === "error" && (
              <div
                style={{
                  marginTop: 14,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  fontSize: 12.5,
                  color: "#FCA5A5",
                }}
              >
                {step.message}
              </div>
            )}

            {/* MetaMask "Unknown Token" Transparency Diagnostic */}
            <div style={{ marginTop: 14, borderTop: "1px solid rgba(255, 255, 255, 0.06)", paddingTop: 12 }}>
              <div
                onClick={() => setShowMetaMaskHelp(!showMetaMaskHelp)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  fontSize: 12,
                  color: "#9CA3AF",
                }}
              >
                <span>Why did MetaMask show &quot;Sending 1 Unknown&quot;?</span>
                <span style={{ fontSize: 14 }}>{showMetaMaskHelp ? "▲" : "▼"}</span>
              </div>

              {showMetaMaskHelp && (
                <div
                  style={{
                    marginTop: 8,
                    padding: 12,
                    borderRadius: 8,
                    background: "#0D0F16",
                    fontSize: 11.5,
                    color: "#9CA3AF",
                    lineHeight: 1.5,
                  }}
                >
                  <p style={{ margin: "0 0 8px" }}>
                    When your wallet holds <strong>0 {activeMeta.tokenSymbol}</strong> or <strong>0 {activeMeta.currency}</strong> for gas, MetaMask&apos;s transaction simulation reverts. Because the simulation fails, MetaMask cannot confirm the asset or state diff, and falls back to displaying &quot;Sending 1 Unknown&quot; and &quot;This transaction is likely to fail&quot;.
                  </p>
                  <p style={{ margin: "0 0 10px" }}>
                    To ensure MetaMask resolves the token brand and symbol cleanly:
                  </p>
                  <button
                    onClick={handleRegisterToken}
                    style={{
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: 6,
                      color: "#E5E7EB",
                      fontSize: 11.5,
                      fontWeight: 500,
                      padding: "6px 12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span>🦊</span>
                    <span>Register {activeMeta.tokenSymbol} in MetaMask ({activeMeta.name})</span>
                  </button>
                  {watchAssetSuccess !== null && (
                    <div style={{ marginTop: 6, color: watchAssetSuccess ? "#34D399" : "#F87171" }}>
                      {watchAssetSuccess
                        ? `✓ ${activeMeta.tokenSymbol} registered with official logo and 6 decimals.`
                        : `Could not register asset in wallet.`}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Claiming Demo Pass State */}
        {step.kind === "claiming" && (
          <div style={{ marginTop: 24, textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>⚡</div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Activating Ecosystem Review Pass…</div>
            <div style={{ marginTop: 6, fontSize: 12.5, color: "#9CA3AF" }}>
              Minting initial $1.50 research fuel to your session treasury.
            </div>
          </div>
        )}

        {/* Sending Transaction State */}
        {step.kind === "sending" && (
          <div style={{ marginTop: 24, textAlign: "center", padding: "16px 0" }}>
            <div
              style={{
                width: 36,
                height: 36,
                margin: "0 auto 14px",
                border: "3px solid rgba(234, 88, 12, 0.2)",
                borderTopColor: "#EA580C",
                borderRadius: "50%",
                animation: "qerin-spin 0.8s linear infinite",
              }}
            />
            <div style={{ fontWeight: 600, fontSize: 15 }}>
              Awaiting Wallet Signature for ${step.amountUsd}.00 {activeMeta.tokenSymbol}…
            </div>
            <div style={{ marginTop: 6, fontSize: 12.5, color: "#9CA3AF" }}>
              Authorizing settlement deposit to Qerin Settlement Vault on {activeMeta.name}.
            </div>
            <div
              style={{
                marginTop: 12,
                fontSize: 11.5,
                fontFamily: "monospace",
                color: "#6B7280",
                background: "#0D0F16",
                padding: "6px 12px",
                borderRadius: 6,
                display: "inline-block",
              }}
            >
              Vault: 0x5b2131…34554311F2
            </div>
          </div>
        )}

        {/* Confirming On-Chain State */}
        {step.kind === "confirming" && (
          <div style={{ marginTop: 24, textAlign: "center", padding: "16px 0" }}>
            <div
              style={{
                width: 36,
                height: 36,
                margin: "0 auto 14px",
                border: "3px solid rgba(234, 88, 12, 0.2)",
                borderTopColor: "#EA580C",
                borderRadius: "50%",
                animation: "qerin-spin 0.8s linear infinite",
              }}
            />
            <div style={{ fontWeight: 600, fontSize: 15 }}>
              Deposit Broadcast — Verifying on {activeMeta.name}…
            </div>
            <div style={{ marginTop: 6, fontSize: 12.5, color: "#9CA3AF" }}>
              Validating cryptographic receipt on-chain (Attempt {step.attempt}/{CONFIRM_MAX_ATTEMPTS})
            </div>
            <a
              href={explorerUrl(step.txHash, step.network)}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-block",
                marginTop: 12,
                fontSize: 12,
                color: "#EA580C",
                textDecoration: "none",
              }}
            >
              {shortHash(step.txHash)} — View on Explorer ↗
            </a>
          </div>
        )}

        {/* Success State */}
        {step.kind === "success" && (
          <div style={{ marginTop: 24, textAlign: "center", padding: "16px 0" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px",
                color: "#10B981",
                fontSize: 22,
              }}
            >
              ✓
            </div>
            <div style={{ fontWeight: 700, fontSize: 17, color: "#FFFFFF" }}>
              Agent Treasury Funded
            </div>
            <div style={{ marginTop: 6, fontSize: 13.5, color: "#34D399" }}>
              Available Fuel: ${step.balance.toFixed(2)} USD
            </div>
            {step.message && (
              <div style={{ marginTop: 4, fontSize: 12, color: "#9CA3AF" }}>
                {step.message}
              </div>
            )}
            {step.txHash && (
              <a
                href={explorerUrl(step.txHash, network)}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-block",
                  marginTop: 10,
                  fontSize: 12,
                  color: "#EA580C",
                  textDecoration: "none",
                }}
              >
                {shortHash(step.txHash)} — View On-Chain Receipt ↗
              </a>
            )}
          </div>
        )}

        {/* Stuck State */}
        {step.kind === "stuck" && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#F87171" }}>
              Deposit sent but awaiting confirmation
            </div>
            <div style={{ marginTop: 6, fontSize: 12.5, color: "#9CA3AF" }}>
              {step.reason}
            </div>
            <a
              href={explorerUrl(step.txHash, step.network)}
              target="_blank"
              rel="noreferrer"
              style={{ display: "block", marginTop: 8, fontSize: 12, color: "#EA580C" }}
            >
              {shortHash(step.txHash)} — View on Explorer ↗
            </a>
            <button
              onClick={() =>
                onResumePending({
                  txHash: step.txHash,
                  amountUsd: step.amountUsd,
                  network: step.network,
                  sentAt: Date.now(),
                })
              }
              style={{
                marginTop: 14,
                width: "100%",
                height: 42,
                background: "#EA580C",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 13.5,
                color: "#FFFFFF",
                cursor: "pointer",
              }}
            >
              Retry On-Chain Confirmation
            </button>
          </div>
        )}

        {/* Dismiss / Close Button */}
        {canDismiss && (
          <button
            onClick={onClose}
            style={{
              marginTop: 18,
              width: "100%",
              height: 42,
              background: "transparent",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 10,
              fontWeight: 500,
              fontSize: 13.5,
              color: "#9CA3AF",
              cursor: "pointer",
            }}
          >
            {step.kind === "success" ? "Done" : "Cancel"}
          </button>
        )}
      </div>

      <style>{`
        @keyframes qerin-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
