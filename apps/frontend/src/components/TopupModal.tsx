"use client";

import { useState } from "react";

const AMOUNTS = [5, 10, 20];

export function TopupModal({
  onClose,
  onTopup,
  onTopupCrypto,
  reason,
}: {
  onClose: () => void;
  onTopup: (amountUsd: number) => Promise<void>;
  onTopupCrypto: (amountUsd: number) => Promise<void>;
  reason?: string | null;
}) {
  const [loadingAmount, setLoadingAmount] = useState<number | null>(null);
  const [cryptoLoadingAmount, setCryptoLoadingAmount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = loadingAmount !== null || cryptoLoadingAmount !== null;

  const onPick = async (amountUsd: number) => {
    setLoadingAmount(amountUsd);
    setError(null);
    try {
      await onTopup(amountUsd);
    } catch (err) {
      // The user closing the Razorpay modal without paying isn't an error
      // worth surfacing — just let them try again.
      if (err instanceof Error && err.message === "dismissed") return;
      setError(err instanceof Error ? err.message : "Could not start top-up. Try again.");
    } finally {
      setLoadingAmount(null);
    }
  };

  const onPickCrypto = async (amountUsd: number) => {
    setCryptoLoadingAmount(amountUsd);
    setError(null);
    try {
      await onTopupCrypto(amountUsd);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete the USDC top-up. Try again.");
    } finally {
      setCryptoLoadingAmount(null);
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(18, 20, 26, 0.5)",
        display: "flex",
        alignItems: "flex-end",
        zIndex: 10,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          background: "#F7F5F0",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          padding: 24,
          boxSizing: "border-box",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 18, color: "#12141A" }}>Top up your balance</div>
        <div style={{ marginTop: 6, fontSize: 14, color: "#6B6E76" }}>
          {reason ?? "Fund your balance to keep asking questions — Qerin pays sources with it."}
        </div>
        <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
          {AMOUNTS.map((amountUsd) => (
            <button
              key={amountUsd}
              onClick={() => onPick(amountUsd)}
              disabled={busy}
              className="qerin-pill-btn"
              style={{
                flex: 1,
                height: 52,
                background: "#0000FF",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 16,
                color: "#F7F5F0",
                cursor: busy ? "default" : "pointer",
                opacity: loadingAmount !== null && loadingAmount !== amountUsd ? 0.5 : 1,
                fontFamily: "var(--font-inter), sans-serif",
              }}
            >
              {loadingAmount === amountUsd ? "…" : `$${amountUsd}`}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "#6B6E76" }}>
          Pay by UPI, card, or netbanking — your balance updates immediately once payment
          completes.
        </div>

        <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #D8D5CC" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#12141A" }}>Or pay directly with USDC</div>
          <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
            {AMOUNTS.map((amountUsd) => (
              <button
                key={amountUsd}
                onClick={() => onPickCrypto(amountUsd)}
                disabled={busy}
                className="qerin-pill-btn"
                style={{
                  flex: 1,
                  height: 52,
                  background: "transparent",
                  border: "1px solid #12141A",
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 16,
                  color: "#12141A",
                  cursor: busy ? "default" : "pointer",
                  opacity: cryptoLoadingAmount !== null && cryptoLoadingAmount !== amountUsd ? 0.5 : 1,
                  fontFamily: "var(--font-inter), sans-serif",
                }}
              >
                {cryptoLoadingAmount === amountUsd ? "…" : `$${amountUsd}`}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: "#6B6E76" }}>
            Connect a wallet and send USDC on Base — your balance updates as soon as the
            transaction confirms on-chain.
          </div>
        </div>
        {error && <div style={{ marginTop: 12, fontSize: 13, color: "#B23B3B" }}>{error}</div>}
        <button
          onClick={onClose}
          style={{
            marginTop: 16,
            width: "100%",
            height: 44,
            background: "transparent",
            border: "1px solid #D8D5CC",
            borderRadius: 8,
            fontWeight: 500,
            fontSize: 14,
            color: "#12141A",
            cursor: "pointer",
            fontFamily: "var(--font-inter), sans-serif",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
