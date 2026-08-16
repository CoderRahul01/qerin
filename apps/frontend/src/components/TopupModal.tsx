"use client";

import { useEffect, useState } from "react";
import {
  sendUsdcTransfer,
  signTopupConfirmation,
  getPendingTopup,
  clearPendingTopup,
  type PendingTopup,
} from "@/lib/cryptoTopup";
import { confirmCryptoTopup } from "@/lib/account";

const AMOUNTS = [1, 5, 10, 20];
const NOT_MINED_REASON = "not found on-chain yet";
const CONFIRM_RETRY_INTERVAL_MS = 3000;
const CONFIRM_MAX_ATTEMPTS = 10; // ~30s of retrying before surfacing "stuck"

type Step =
  | { kind: "idle" }
  | { kind: "sending"; amountUsd: number }
  | { kind: "confirming"; txHash: string; amountUsd: number; attempt: number }
  | { kind: "success"; balance: number; txHash: string }
  | { kind: "stuck"; txHash: string; amountUsd: number; reason: string }
  | { kind: "error"; message: string };

function explorerUrl(txHash: string): string {
  return `https://basescan.org/tx/${txHash}`;
}

function shortHash(txHash: string): string {
  return `${txHash.slice(0, 10)}…${txHash.slice(-6)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function TopupModal({
  accountId,
  onClose,
  onCredited,
  reason,
}: {
  accountId: string;
  onClose: () => void;
  onCredited: (balance: number) => void;
  reason?: string | null;
}) {
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const [pending, setPending] = useState<PendingTopup | null>(null);

  useEffect(() => {
    setPending(getPendingTopup(accountId));
  }, [accountId]);

  const busy = step.kind === "sending" || step.kind === "confirming";

  // Signs once, then retries only the confirm HTTP call on the specific
  // "not mined yet" response — never re-prompts the wallet and never
  // re-sends money. Used both right after a fresh send and to resume a
  // previously-persisted pending payment.
  const runConfirm = async (txHash: string, amountUsd: number) => {
    let signature: string;
    try {
      signature = await signTopupConfirmation(accountId, txHash);
    } catch (err) {
      setStep({
        kind: "stuck",
        txHash,
        amountUsd,
        reason: err instanceof Error ? err.message : "Could not sign the confirmation message",
      });
      return;
    }

    for (let attempt = 1; attempt <= CONFIRM_MAX_ATTEMPTS; attempt++) {
      setStep({ kind: "confirming", txHash, amountUsd, attempt });
      try {
        const balance = await confirmCryptoTopup(accountId, txHash, signature);
        clearPendingTopup(accountId);
        setPending(null);
        setStep({ kind: "success", balance, txHash });
        onCredited(balance);
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not confirm top-up";
        const notMinedYet = message.toLowerCase().includes(NOT_MINED_REASON);
        if (notMinedYet && attempt < CONFIRM_MAX_ATTEMPTS) {
          await sleep(CONFIRM_RETRY_INTERVAL_MS);
          continue;
        }
        setStep({ kind: "stuck", txHash, amountUsd, reason: message });
        return;
      }
    }
  };

  const onPick = async (amountUsd: number) => {
    setStep({ kind: "sending", amountUsd });
    let txHash: string;
    try {
      txHash = await sendUsdcTransfer(accountId, amountUsd);
    } catch (err) {
      // Nothing was sent yet — safe to just show an error and let them
      // retry freely, no funds are at risk here.
      setStep({ kind: "error", message: err instanceof Error ? err.message : "Could not send payment" });
      return;
    }
    setPending({ txHash, amountUsd, sentAt: Date.now() });
    await runConfirm(txHash, amountUsd);
  };

  const onResume = async (record: PendingTopup) => {
    await runConfirm(record.txHash, record.amountUsd);
  };

  const canDismiss = !busy;

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
      onClick={canDismiss ? onClose : undefined}
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

        {/* A payment from an earlier visit that never finished confirming —
            resuming re-checks the same transaction, it never sends money again. */}
        {pending && step.kind === "idle" && (
          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 8,
              border: "1px solid #0000FF",
              background: "#F0F0FF",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: "#12141A" }}>
              You have a ${pending.amountUsd} payment waiting to be confirmed
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: "#6B6E76" }}>
              This USDC was already sent — resuming just re-checks it, it will not send again.
            </div>
            <button
              onClick={() => onResume(pending)}
              className="qerin-pill-btn"
              style={{
                marginTop: 10,
                height: 40,
                width: "100%",
                background: "#0000FF",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 14,
                color: "#F7F5F0",
                cursor: "pointer",
                fontFamily: "var(--font-inter), sans-serif",
              }}
            >
              Resume payment
            </button>
          </div>
        )}

        {(step.kind === "idle" || step.kind === "error") && (
          <>
            <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
              {AMOUNTS.map((amountUsd) => (
                <button
                  key={amountUsd}
                  onClick={() => onPick(amountUsd)}
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
                    cursor: "pointer",
                    fontFamily: "var(--font-inter), sans-serif",
                  }}
                >
                  ${amountUsd}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: "#6B6E76" }}>
              Connect a wallet and send USDC on Base — your balance updates as soon as the
              transaction confirms on-chain.
            </div>
            {step.kind === "error" && (
              <div style={{ marginTop: 12, fontSize: 13, color: "#B23B3B" }}>{step.message}</div>
            )}
          </>
        )}

        {step.kind === "sending" && (
          <div style={{ marginTop: 20, fontSize: 14, color: "#12141A" }}>
            Waiting for your wallet to send ${step.amountUsd} USDC…
          </div>
        )}

        {step.kind === "confirming" && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 14, color: "#12141A" }}>
              Payment sent — confirming on Base{step.attempt > 1 ? ` (attempt ${step.attempt})` : ""}…
            </div>
            <a
              href={explorerUrl(step.txHash)}
              target="_blank"
              rel="noreferrer"
              style={{ display: "block", marginTop: 8, fontSize: 12, color: "#0000FF" }}
            >
              {shortHash(step.txHash)} — view on Basescan ↗
            </a>
          </div>
        )}

        {step.kind === "success" && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#12141A" }}>
              ✓ Credited — balance is now ${step.balance}
            </div>
            <a
              href={explorerUrl(step.txHash)}
              target="_blank"
              rel="noreferrer"
              style={{ display: "block", marginTop: 8, fontSize: 12, color: "#0000FF" }}
            >
              {shortHash(step.txHash)} — view on Basescan ↗
            </a>
          </div>
        )}

        {step.kind === "stuck" && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#B23B3B" }}>
              Your ${step.amountUsd} payment was sent but hasn't confirmed yet
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: "#6B6E76" }}>{step.reason}</div>
            <div style={{ marginTop: 6, fontSize: 12, color: "#6B6E76" }}>
              Do not send another payment — this one already happened and is safe to retry.
            </div>
            <a
              href={explorerUrl(step.txHash)}
              target="_blank"
              rel="noreferrer"
              style={{ display: "block", marginTop: 8, fontSize: 12, color: "#0000FF" }}
            >
              {shortHash(step.txHash)} — view on Basescan ↗
            </a>
            <button
              onClick={() => onResume({ txHash: step.txHash, amountUsd: step.amountUsd, sentAt: Date.now() })}
              className="qerin-pill-btn"
              style={{
                marginTop: 16,
                width: "100%",
                height: 44,
                background: "#0000FF",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 14,
                color: "#F7F5F0",
                cursor: "pointer",
                fontFamily: "var(--font-inter), sans-serif",
              }}
            >
              Retry confirmation
            </button>
          </div>
        )}

        {canDismiss && (
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
            {step.kind === "success" ? "Close" : "Cancel"}
          </button>
        )}
      </div>
    </div>
  );
}
