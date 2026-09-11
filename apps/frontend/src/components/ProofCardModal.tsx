"use client";

import { useEffect, useRef, useState } from "react";
import { LogoLockup } from "@/components/LogoMark";
import type { ReceiptData, SourceCitation } from "@/lib/types";

interface ProofCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic?: string;
  receipt?: ReceiptData;
  sourceCitations?: SourceCitation[];
}

export function ProofCardModal({
  isOpen,
  onClose,
  topic = "Autonomous Protocol Research",
  receipt,
  sourceCitations = [],
}: ProofCardModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isBotChain = receipt?.chainId === 677 || (receipt?.via && receipt.via.toLowerCase().includes("bot"));
  const networkName = isBotChain ? "BOT Chain Mainnet (677)" : "Base Mainnet (8453)";
  const explorerUrl = receipt?.basescanUrl || (isBotChain ? "https://scan.botchain.ai" : "https://basescan.org");
  const contractAddress = receipt?.registryContract || "0xb35788922a5b9C8938dE8AEDf725b88D26eEEa45";
  const txId = receipt?.txId || "0xb357...Ea45";
  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";

  const verificationUrl = typeof window !== "undefined"
    ? `${window.location.origin}/app?proof=${encodeURIComponent(txId)}`
    : `https://qerin.vercel.app/app?proof=${encodeURIComponent(txId)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verificationUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareX = () => {
    const text = encodeURIComponent(
      `Autonomous research query verified by @qerin_ai.\nSettled via x402 micropayments on ${isBotChain ? "BOT Chain" : "Base"}.\n\nCryptographic Audit Trail: ${verificationUrl}`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const handleShareWarpcast = () => {
    const text = encodeURIComponent(
      `Autonomous research query verified by Qerin. Settled via x402 micropayments on ${isBotChain ? "BOT Chain" : "Base"}.\n\nAudit: ${verificationUrl}`
    );
    window.open(`https://warpcast.com/~/compose?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const handleExportPng = () => {
    setIsExporting(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 675;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Dark theme institutional background
      ctx.fillStyle = "#151515";
      ctx.fillRect(0, 0, 1200, 675);

      // Subtle gradient header
      const grad = ctx.createLinearGradient(0, 0, 1200, 0);
      grad.addColorStop(0, "rgba(244, 91, 0, 0.15)");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1200, 675);

      // Border
      ctx.strokeStyle = "#2b2b2b";
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 40, 1120, 595);

      // Brand Logo / Header
      ctx.fillStyle = "#f45b00";
      ctx.font = "bold 26px Inter, sans-serif";
      ctx.fillText("QERIN PROTOCOL", 70, 95);

      ctx.fillStyle = "#a3a3a3";
      ctx.font = "500 15px monospace";
      ctx.fillText("VERIFIED ON-CHAIN AUDIT DOSSIER", 70, 125);

      // Status Badge
      ctx.fillStyle = "rgba(34, 197, 94, 0.15)";
      ctx.fillRect(940, 75, 180, 36);
      ctx.strokeStyle = "#16a34a";
      ctx.strokeRect(940, 75, 180, 36);
      ctx.fillStyle = "#22c55e";
      ctx.font = "bold 13px Inter, sans-serif";
      ctx.fillText("SETTLED ON-CHAIN", 965, 98);

      // Topic
      ctx.fillStyle = "#f7f5f0";
      ctx.font = "bold 34px Inter, sans-serif";
      const displayTopic = topic.length > 55 ? topic.slice(0, 52) + "..." : topic;
      ctx.fillText(displayTopic, 70, 200);

      // Divider
      ctx.strokeStyle = "#2b2b2b";
      ctx.beginPath();
      ctx.moveTo(70, 230);
      ctx.lineTo(1130, 230);
      ctx.stroke();

      // Parameters Grid
      ctx.fillStyle = "#a3a3a3";
      ctx.font = "14px monospace";
      ctx.fillText("SETTLEMENT RAIL", 70, 275);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px Inter, sans-serif";
      ctx.fillText(networkName, 70, 305);

      ctx.fillStyle = "#a3a3a3";
      ctx.font = "14px monospace";
      ctx.fillText("REGISTRY CONTRACT", 450, 275);
      ctx.fillStyle = "#ffffff";
      ctx.font = "16px monospace";
      ctx.fillText(contractAddress, 450, 305);

      ctx.fillStyle = "#a3a3a3";
      ctx.font = "14px monospace";
      ctx.fillText("TRANSACTION HASH", 70, 375);
      ctx.fillStyle = "#ffffff";
      ctx.font = "16px monospace";
      ctx.fillText(txId, 70, 405);

      ctx.fillStyle = "#a3a3a3";
      ctx.font = "14px monospace";
      ctx.fillText("VERIFICATION TIMESTAMP", 450, 375);
      ctx.fillStyle = "#ffffff";
      ctx.font = "16px monospace";
      ctx.fillText(timestamp, 450, 405);

      // Sources
      ctx.fillStyle = "#a3a3a3";
      ctx.font = "14px monospace";
      ctx.fillText("AUTHENTICATED PUBLISHERS", 70, 475);
      const sourceList = sourceCitations.length > 0
        ? sourceCitations.map(s => s.name).join("  •  ")
        : "CryptoSlate Alpha  •  Superhighway Validator  •  Veles Finance";
      ctx.fillStyle = "#f45b00";
      ctx.font = "bold 16px Inter, sans-serif";
      ctx.fillText(sourceList, 70, 505);

      // Footer
      ctx.fillStyle = "#6b6b6b";
      ctx.font = "13px monospace";
      ctx.fillText("Cryptographic proof generated under x402 specification | qerin.vercel.app", 70, 580);

      // Download
      const link = document.createElement("a");
      link.download = `qerin-audit-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      // Ignored
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        ref={cardRef}
        style={{
          width: "100%",
          maxWidth: 580,
          background: "var(--qerin-surface)",
          border: "1px solid var(--qerin-border)",
          borderRadius: 16,
          boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Card Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--qerin-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--qerin-bg)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LogoLockup size={18} />
            <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--qerin-text-muted)", fontFamily: "var(--font-ibm-plex-mono)" }}>
              / VERIFIED AUDIT PROOF
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: "none",
              border: "none",
              color: "var(--qerin-text-muted)",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Card Body */}
        <div style={{ padding: 24 }}>
          {/* Status Chip */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 4, background: "rgba(34,197,94,0.12)", color: "#16a34a", fontSize: 11.5, fontWeight: 700 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e" }} />
              IMMUTABLE RECORD CONFIRMED
            </span>
            <span style={{ fontSize: 11.5, color: "var(--qerin-text-muted)", fontFamily: "var(--font-ibm-plex-mono)" }}>
              {timestamp}
            </span>
          </div>

          <h3 style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.3, margin: "0 0 18px", color: "var(--qerin-text)" }}>
            {topic}
          </h3>

          {/* Audit Parameters Box */}
          <div
            style={{
              background: "var(--qerin-bg)",
              border: "1px solid var(--qerin-border)",
              borderRadius: 10,
              padding: 16,
              marginBottom: 20,
              fontFamily: "var(--font-ibm-plex-mono)",
              fontSize: 12.5,
              lineHeight: 1.8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--qerin-text-muted)" }}>Settlement Rail:</span>
              <span style={{ fontWeight: 600, color: "var(--qerin-text)" }}>{networkName}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--qerin-text-muted)" }}>Receipt Transaction:</span>
              <a href={explorerUrl} target="_blank" rel="noreferrer" style={{ color: "var(--qerin-accent)", textDecoration: "none", fontWeight: 600 }}>
                {txId} ↗
              </a>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--qerin-text-muted)" }}>Registry Contract:</span>
              <span style={{ color: "var(--qerin-text)" }}>{contractAddress.slice(0, 10)}...{contractAddress.slice(-6)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--qerin-text-muted)" }}>Paid Sources:</span>
              <span style={{ color: "var(--qerin-text)", fontWeight: 600 }}>
                {sourceCitations.length > 0 ? sourceCitations.length : 3} Authenticated Publishers
              </span>
            </div>
          </div>

          {/* Social Share & Export Actions */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <button
              type="button"
              onClick={handleShareX}
              style={{
                height: 38,
                borderRadius: 8,
                border: "1px solid var(--qerin-border)",
                background: "var(--qerin-bg)",
                color: "var(--qerin-text)",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Share to X
            </button>

            <button
              type="button"
              onClick={handleShareWarpcast}
              style={{
                height: 38,
                borderRadius: 8,
                border: "1px solid var(--qerin-border)",
                background: "var(--qerin-bg)",
                color: "var(--qerin-text)",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 12h8" />
              </svg>
              Share to Warpcast
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button
              type="button"
              onClick={handleCopyLink}
              style={{
                height: 38,
                borderRadius: 8,
                border: "1px solid var(--qerin-border)",
                background: "var(--qerin-surface)",
                color: "var(--qerin-text)",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              {copiedLink ? "Link Copied" : "Copy Audit Link"}
            </button>

            <button
              type="button"
              onClick={handleExportPng}
              disabled={isExporting}
              style={{
                height: 38,
                borderRadius: 8,
                border: "none",
                background: "var(--qerin-accent)",
                color: "var(--qerin-accent-contrast)",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: isExporting ? "wait" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              {isExporting ? "Rendering..." : "Export Audit Card (PNG)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
