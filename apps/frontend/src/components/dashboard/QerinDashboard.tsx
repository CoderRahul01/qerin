"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoLockup } from "@/components/LogoMark";
import { TopupModal } from "@/components/TopupModal";
import { getOrCreateAccountId, fetchBalance, getConnectedWalletAddress, requestWalletConnection } from "@/lib/account";
import { useQerinAnswer } from "@/lib/useQerinAnswer";
import { selectSourcesForDisplay } from "@/lib/selectSources";
import type { AnswerData, PersonaInsights, ReceiptItem, SourceCitation } from "@/lib/types";
import { downloadDossierPdf, generateDossierMarkdown } from "@/lib/dossierExport";

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "thinking";
  content: string;
  time: string;
  receipt?: ReceiptData;
  rawReceipts?: ReceiptItem[];
  sourceCitations?: SourceCitation[];
  topic?: string;
  summary?: string;
  personaInsights?: PersonaInsights;
  thinkingFor?: string;
  question?: string;
  userAccount?: string;
  costDebited?: number;
  remainingBalance?: number | null;
}

interface ReceiptData {
  paid: string;
  to: string;
  via: string;
  txId: string;
  basescanUrl: string;
  success: boolean;
  sourceCitations?: SourceCitation[];
  registryTxHash?: string;
  registryContract?: string;
  chainId?: number;
}

interface ChatThread {
  id: string;
  title: string;
  topic?: string;
  preview: string;
  timeLabel: string;
  messages: ChatMessage[];
  network?: string;
}

function nowTime(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function shortAddr(addr: string): string {
  if (addr.length <= 12) return addr;
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function buildAnswerData(data: AnswerData): {
  content: string;
  receipt: ReceiptData | undefined;
  rawReceipts: ReceiptItem[] | undefined;
  sourceCitations: SourceCitation[] | undefined;
} {
  const content = data.answer ?? "";
  let receipt: ReceiptData | undefined;
  if (data.receipt && data.receipt.length > 0) {
    const tx = data.registryTxHash || data.receipt[0].txHash;
    const isBotChain = data.chainId === 677 || (data.network && data.network.toLowerCase().includes("bot"));
    const botContract = "0xb35788922a5b9C8938dE8AEDf725b88D26eEEa45";
    const baseContract = "0xb35788922a5b9C8938dE8AEDf725b88D26eEEa45";
    const defaultUrl = data.registryExplorerUrl || (
      isBotChain
        ? (tx ? `https://scan.botchain.ai/tx/${tx}` : `https://scan.botchain.ai/address/${botContract}`)
        : (tx ? `https://basescan.org/tx/${tx}` : `https://basescan.org/address/${baseContract}`)
    );
    const sourceNames = data.receipt.map((x) => x.source).join(", ");
    receipt = {
      paid: data.totalPaid + " USDC",
      to: sourceNames || data.receipt[0].source,
      via: data.network || (isBotChain ? "BOT Chain Mainnet" : "Base Mainnet"),
      txId: tx ? `${tx.slice(0, 8)}...${tx.slice(-6)}` : "0xb357...Ea45 (Contract)",
      basescanUrl: defaultUrl,
      success: true,
      sourceCitations: data.sourceCitations,
      registryTxHash: data.registryTxHash,
      registryContract: data.registryContract || (isBotChain ? botContract : baseContract),
      chainId: data.chainId || (isBotChain ? 677 : 8453),
    };
  }
  return { content, receipt, rawReceipts: data.receipt, sourceCitations: data.sourceCitations };
}

const SAMPLE_RECEIPT: ReceiptData = {
  paid: "0.0200 USDC",
  to: "Institutional Signal Node",
  via: "Base",
  txId: "0x3fa7...8c1e",
  basescanUrl: "https://basescan.org",
  success: true,
};

const SEED_THREADS: ChatThread[] = [
  {
    id: "t1",
    title: "Ethereum Pectra: Upgrade Details",
    topic: "Ethereum Pectra: Upgrade Details",
    preview: "What's the latest on Ethereum upgrades?",
    timeLabel: "2m ago",
    network: "Base Mainnet",
    messages: [
      { id: "m1", role: "user", content: "What's the latest on Ethereum upgrades?", time: "10:42 AM" },
      {
        id: "m2",
        role: "assistant",
        question: "What's the latest on Ethereum upgrades?",
        topic: "Ethereum Pectra: Upgrade Details",
        summary: "• Pectra combines Prague execution and Electra consensus layer upgrades.\n• Target mainnet release scheduled for Q2 2025.\n• Introduces EIP-7702 account abstraction and expands validator stake limit to 2,048 ETH.",
        personaInsights: {
          developer: "EIP-7702 allows EOAs to temporarily execute smart contract bytecode, enabling gasless transactions and batching without contract wallet migration.",
          founder: "Massive UX unlock for mainstream Web3 apps — wallet onboarding friction decreases significantly.",
          contentWriter: "'Ethereum's Pectra upgrade marks the biggest leap in account abstraction since ERC-4337.'",
          trader: "Lower blob fees and optimized validator economics improve L2 throughput and ETH staking yield efficiency.",
        },
        content: "Ethereum's upcoming upgrade, Pectra, is set to go live on mainnet in Q2 2025. It combines the Prague execution layer and Electra consensus layer upgrades to improve scalability, UX, and staking efficiency.\n\nKey highlights:\n• **EIP-7702**: Enables smart contract wallets for EOAs\n• **Increased validator stake limit** from 32 ETH to 2,048 ETH\n• **Blob throughput** improvement for L2 scalability\n• **Better UX** for staking and withdrawals\n\nSource: Decentralized Research Protocol, Ethereum Foundation",
        time: "10:43 AM",
        receipt: SAMPLE_RECEIPT,
        userAccount: "0x1577...2b7e",
        costDebited: 0.15,
        remainingBalance: 2.80,
      },
    ],
  },
  {
    id: "t2",
    title: "SOL vs AVAX: Architecture & DeFi",
    topic: "SOL vs AVAX: Architecture & DeFi",
    preview: "Compare SOL vs AVAX performance",
    timeLabel: "1h ago",
    network: "Base Mainnet",
    messages: [
      { id: "s1", role: "user", content: "Compare SOL vs AVAX performance", time: "9:12 AM" },
      {
        id: "s2",
        role: "assistant",
        question: "Compare SOL vs AVAX performance",
        topic: "SOL vs AVAX: Architecture & DeFi",
        summary: "• Solana optimizes for single-state global throughput (65k TPS theoretical).\n• Avalanche utilizes subnets and tri-chain architecture for enterprise modularity.\n• Both offer sub-second to ~1s finality with distinct decentralization tradeoffs.",
        personaInsights: {
          developer: "Solana requires Rust/Sealevel parallel execution; Avalanche C-Chain supports standard EVM and custom VM subnets.",
          founder: "Choose Solana for consumer apps needing maximum liquidity; choose Avalanche for compliance-friendly custom subnets.",
          contentWriter: "The L1 battle between monolithic speed (Solana) and modular subnets (Avalanche) enters a new phase.",
          trader: "Watch SOL DEX volumes vs AVAX institutional subnet announcements as key valuation drivers.",
        },
        content: "**Solana (SOL)** and **Avalanche (AVAX)** are both high-performance L1 blockchains but with different architectural approaches.\n\n**Solana:** ~65,000 TPS theoretical, sub-400ms finality, single-shard design with Proof of History.\n\n**Avalanche:** ~4,500 TPS on C-Chain, ~1s finality, tri-chain architecture. Strong subnet customization.\n\nSource: Web3 Protocol Research, On-Chain Market Search",
        time: "9:13 AM",
        receipt: { paid: "0.0200 USDC", to: "Web3 Protocol Research", via: "Base", txId: "0x9ab2...f1d3", basescanUrl: "https://basescan.org", success: true },
        userAccount: "0x1577...2b7e",
        costDebited: 0.15,
        remainingBalance: 2.95,
      },
    ],
  },
  { id: "t3", title: "Restaking Protocols: EigenLayer & Symbiotic", preview: "What is restaking and how does it work?", timeLabel: "1d ago", messages: [] },
  { id: "t4", title: "Base Ecosystem: Top Protocols by TVL", preview: "Top DeFi protocols by TVL on Base", timeLabel: "2d ago", messages: [] },
];

function Avatar({ letter, size = 32, bg = "var(--qd-avatar-user)" }: { letter: string; size?: number; bg?: string }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: size * 0.4, flexShrink: 0, fontFamily: "var(--font-inter), sans-serif" }}>
      {letter}
    </div>
  );
}

function QerinAvatar({ size = 28 }: { size?: number }) {
  return <Image src="/qerin-mark-orange.png" alt="Qerin" width={size} height={size} style={{ flexShrink: 0, borderRadius: 6 }} />;
}

function ThinkingBubble({ text }: { text: string }) {
  return (
    <div className="qd-ai-msg qd-msg-enter">
      <QerinAvatar />
      <div className="qd-ai-content">
        <div className="qd-ai-bubble" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", gap: 4 }}>
            <span className="qd-thinking-dot" />
            <span className="qd-thinking-dot" />
            <span className="qd-thinking-dot" />
          </div>
          <span style={{ fontSize: 13, color: "var(--qd-muted2)" }}>{text}</span>
        </div>
      </div>
    </div>
  );
}

function ReceiptCard({
  receipt,
  rawReceipts,
  userAccount,
  costDebited = 0.15,
  remainingBalance,
}: {
  receipt: ReceiptData;
  rawReceipts?: ReceiptItem[];
  userAccount?: string;
  costDebited?: number;
  remainingBalance?: number | null;
}) {
  const [showAudit, setShowAudit] = useState(false);
  const isBotChain = receipt.chainId === 677 || (receipt.via && receipt.via.toLowerCase().includes("bot"));
  const defaultAddress = "0xb35788922a5b9C8938dE8AEDf725b88D26eEEa45";
  const explorerUrl = receipt.basescanUrl && receipt.basescanUrl !== "#"
    ? receipt.basescanUrl
    : (receipt.registryTxHash
        ? (isBotChain ? `https://scan.botchain.ai/tx/${receipt.registryTxHash}` : `https://basescan.org/tx/${receipt.registryTxHash}`)
        : (isBotChain ? `https://scan.botchain.ai/address/${defaultAddress}` : `https://basescan.org/address/${defaultAddress}`));

  const chainLabel = isBotChain ? "BOT Chain Mainnet (Chain 677)" : "Base Mainnet (Chain 8453)";
  const explorerName = isBotChain ? "BOT Scan" : "Basescan";

  // Build itemized breakdown of each individual source
  const itemizedSources = (() => {
    if (rawReceipts && rawReceipts.length > 0) {
      return rawReceipts.map(r => ({
        name: r.source,
        cost: r.amountPaid ? `${parseFloat(r.amountPaid).toFixed(3)} USDC` : "0.005 USDC",
        protocol: r.source.toLowerCase().includes("node") ? "Consensus Node RPC" : "x402 Protocol (Exact EVM)",
        citation: receipt.sourceCitations?.find(c => c.name.toLowerCase() === r.source.toLowerCase())?.citation,
        txHash: r.txHash || receipt.registryTxHash,
      }));
    }
    if (receipt.sourceCitations && receipt.sourceCitations.length > 0) {
      return receipt.sourceCitations.map(c => ({
        name: c.name,
        cost: "0.005 USDC",
        protocol: c.name.toLowerCase().includes("node") ? "Consensus Node RPC" : "x402 Protocol (Exact EVM)",
        citation: c.citation,
        txHash: receipt.registryTxHash,
      }));
    }
    const names = (receipt.to || "").split(",").map(s => s.trim()).filter(Boolean);
    return names.map(name => ({
      name,
      cost: "0.005 USDC",
      protocol: "x402 Protocol (Exact EVM)",
      citation: undefined as string | undefined,
      txHash: receipt.registryTxHash,
    }));
  })();

  const agentWallet = "0x5b2131e9b28a46Ec10D260A14B9DEB34554311F2";
  const contractAddress = receipt.registryContract || defaultAddress;

  return (
    <div className="qd-receipt-card" style={{ marginTop: 14, padding: "16px", borderRadius: 12, border: "1px solid var(--qd-receipt-border)", background: "rgba(255,255,255,0.02)" }}>
      {/* Top status bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(34,197,94,0.15)", border: "1px solid var(--qd-receipt-success)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="9" height="9" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3.2 5.7L6.5 2" stroke="var(--qd-receipt-success)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--qd-receipt-success)" }}>Autonomous Settlement Verified</span>
            <span style={{ fontSize: 11, color: "var(--qd-muted2)", marginLeft: 6 }}>• On-Chain Proof</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: isBotChain ? "rgba(255,107,0,0.12)" : "rgba(0,82,255,0.12)", color: isBotChain ? "#ff7700" : "#3b82f6", fontWeight: 600, border: `1px solid ${isBotChain ? "rgba(255,107,0,0.3)" : "rgba(0,82,255,0.3)"}` }}>
            {chainLabel}
          </span>
        </div>
      </div>

      {/* INDIVIDUAL USER SETTLEMENT LEDGER */}
      <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--qerin-text)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              👤 Individual Settlement For You
            </span>
          </div>
          <span style={{ fontSize: 11, fontFamily: "var(--font-ibm-plex-mono), monospace", color: "var(--qerin-accent)", fontWeight: 600 }}>
            {userAccount ? shortAddr(userAccount) : "Web3 Identity"}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, marginTop: 4 }}>
          <div style={{ padding: "6px 8px", borderRadius: 6, background: "rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 10.5, color: "var(--qd-muted2)" }}>Query Cost (Your Fuel)</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#f87171", fontFamily: "var(--font-ibm-plex-mono), monospace" }}>
              -${costDebited.toFixed(3)} Fuel
            </div>
          </div>

          <div style={{ padding: "6px 8px", borderRadius: 6, background: "rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 10.5, color: "var(--qd-muted2)" }}>Your Remaining Balance</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--qd-receipt-success)", fontFamily: "var(--font-ibm-plex-mono), monospace" }}>
              {typeof remainingBalance === "number" ? `$${remainingBalance.toFixed(2)} Fuel` : "Active"}
            </div>
          </div>

          <div style={{ padding: "6px 8px", borderRadius: 6, background: "rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 10.5, color: "var(--qd-muted2)" }}>Agent Paid to Sources</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--qerin-text)", fontFamily: "var(--font-ibm-plex-mono), monospace" }}>
              {receipt.paid}
            </div>
          </div>
        </div>
      </div>

      {/* ITEMIZED DATA SOURCE SETTLEMENTS */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--qd-muted2)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            ⚡ Itemized Source Settlements ({itemizedSources.length} Nodes Paid)
          </span>
          <span style={{ fontSize: 11, color: "var(--qd-muted2)" }}>via x402 Micropayments</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {itemizedSources.map((src, i) => (
            <div key={i} style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--qerin-text)" }}>{src.name}</span>
                  <span style={{ fontSize: 9.5, padding: "1px 5px", borderRadius: 4, background: "rgba(255,255,255,0.06)", color: "var(--qd-muted2)", fontFamily: "var(--font-ibm-plex-mono), monospace" }}>
                    {src.protocol}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--qd-receipt-success)", fontFamily: "var(--font-ibm-plex-mono), monospace" }}>
                    {src.cost}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--qd-receipt-success)", fontWeight: 600 }}>✓ Settled</span>
                </div>
              </div>
              {src.citation && (
                <div style={{ fontSize: 11, color: "var(--qd-muted2)", lineHeight: 1.4, paddingLeft: 2 }}>
                  {src.citation}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* COLLAPSIBLE CRYPTOGRAPHIC & ON-CHAIN AUDIT TRAIL */}
      <div style={{ borderTop: "1px solid var(--qd-receipt-border)", paddingTop: 10, marginTop: 10 }}>
        <button
          type="button"
          onClick={() => setShowAudit(prev => !prev)}
          style={{
            background: "none",
            border: "none",
            color: "var(--qerin-accent)",
            fontSize: 11.5,
            fontWeight: 600,
            cursor: "pointer",
            padding: "2px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <span>🔐 View Cryptographic Proof & Smart Contract Audit</span>
          <span style={{ fontSize: 10 }}>{showAudit ? "▲ Hide" : "▼ Expand"}</span>
        </button>

        {showAudit && (
          <div style={{ marginTop: 10, padding: "10px", borderRadius: 8, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 11.5, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--qd-muted2)" }}>Registry Contract</span>
              <a
                href={isBotChain ? `https://scan.botchain.ai/address/${contractAddress}` : `https://basescan.org/address/${contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--qerin-accent)", fontFamily: "var(--font-ibm-plex-mono), monospace", textDecoration: "none" }}
              >
                {shortAddr(contractAddress)} ↗
              </a>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--qd-muted2)" }}>Autonomous Agent Payer</span>
              <a
                href={isBotChain ? `https://scan.botchain.ai/address/${agentWallet}` : `https://basescan.org/address/${agentWallet}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--qerin-text)", fontFamily: "var(--font-ibm-plex-mono), monospace", textDecoration: "none" }}
              >
                {shortAddr(agentWallet)} ↗
              </a>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--qd-muted2)" }}>On-Chain Receipt Tx</span>
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--qerin-accent)", fontFamily: "var(--font-ibm-plex-mono), monospace", textDecoration: "none", fontWeight: 600 }}
              >
                {receipt.txId} ↗
              </a>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--qd-muted2)" }}>Smart Contract Method</span>
              <span style={{ color: "var(--qerin-text)", fontFamily: "var(--font-ibm-plex-mono), monospace", fontSize: 10.5 }}>
                recordReceipt(bytes32,uint256,uint256,string)
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--qd-muted2)" }}>Client Attributed Account</span>
              <span style={{ color: "var(--qerin-text)", fontFamily: "var(--font-ibm-plex-mono), monospace" }}>
                {userAccount ? shortAddr(userAccount) : "Anonymous Consumer"}
              </span>
            </div>

            <div style={{ marginTop: 4, paddingTop: 6, borderTop: "1px dashed rgba(255,255,255,0.08)", fontSize: 11, color: "var(--qd-muted2)" }}>
              ✓ Micropayment settled autonomously on your behalf. Publicly verifiable on {explorerName}.
            </div>
          </div>
        )}
      </div>

      {/* Explorer Direct Link */}
      <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--qd-receipt-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <a href={explorerUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 600, color: "var(--qerin-accent)", display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
          Verify on {explorerName} ↗
        </a>
        <span style={{ fontSize: 11, color: "var(--qd-muted2)" }}>Immutable Delivery Receipt</span>
      </div>
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  const boldify = (text: string) => text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let bulletItems: string[] = [];

  const flushBullets = (key: string) => {
    if (bulletItems.length > 0) {
      elements.push(
        <ul key={key} style={{ margin: "6px 0", paddingLeft: 18, lineHeight: 1.7 }}>
          {bulletItems.map((item, i) => <li key={i} style={{ marginBottom: 2 }} dangerouslySetInnerHTML={{ __html: boldify(item) }} />)}
        </ul>
      );
      bulletItems = [];
    }
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) { flushBullets("ul" + i); elements.push(<div key={"br" + i} style={{ height: 6 }} />); return; }

    if (trimmed.startsWith("### ")) {
      flushBullets("ul" + i);
      elements.push(<div key={"h3-" + i} style={{ marginTop: 14, marginBottom: 4, fontSize: 15, fontWeight: 700, color: "var(--qerin-accent)" }} dangerouslySetInnerHTML={{ __html: boldify(trimmed.slice(4)) }} />);
      return;
    }

    if (trimmed.startsWith("## ")) {
      flushBullets("ul" + i);
      elements.push(<div key={"h2-" + i} style={{ marginTop: 16, marginBottom: 6, fontSize: 16, fontWeight: 700, color: "var(--qerin-accent)" }} dangerouslySetInnerHTML={{ __html: boldify(trimmed.slice(3)) }} />);
      return;
    }

    if (/^\*\*[^*]+\*\*$/.test(trimmed)) {
      flushBullets("ul" + i);
      elements.push(<div key={"sec-" + i} style={{ marginTop: 14, marginBottom: 4, fontWeight: 700, fontSize: 14.5, color: "var(--qerin-text)" }} dangerouslySetInnerHTML={{ __html: boldify(trimmed) }} />);
      return;
    }

    if (trimmed.startsWith("• ") || trimmed.startsWith("* ") || trimmed.startsWith("- ")) { bulletItems.push(trimmed.slice(2)); return; }
    flushBullets("ul" + i);
    elements.push(<p key={"p" + i} style={{ margin: "4px 0", lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: boldify(trimmed) }} />);
  });
  flushBullets("ul-end");
  return <div style={{ fontSize: 14, color: "var(--qerin-text)" }}>{elements}</div>;
}

type PersonaType = "all" | "developer" | "founder" | "writer" | "trader";
const THREADS_STORAGE_KEY = "qerin_chat_threads_v3";
const ACTIVE_THREAD_KEY = "qerin_active_thread_id";

export function QerinDashboard() {
  const [threads, setThreads] = useState<ChatThread[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(THREADS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((t: ChatThread) => ({
              ...t,
              messages: Array.isArray(t.messages)
                ? t.messages.filter((m: ChatMessage) => m.role !== "thinking")
                : [],
            }));
          }
        }
      } catch {}
    }
    return SEED_THREADS;
  });

  const [activeThreadId, setActiveThreadId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(THREADS_STORAGE_KEY);
        const storedActive = localStorage.getItem(ACTIVE_THREAD_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (storedActive && parsed.some((t: ChatThread) => t.id === storedActive)) {
              return storedActive;
            }
            return parsed[0].id;
          }
        }
      } catch {}
    }
    return "t1";
  });

  const [inputValue, setInputValue] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [showTopup, setShowTopup] = useState(false);
  const [topupReason, setTopupReason] = useState<string | null>(null);
  const [activePersona, setActivePersona] = useState<Record<string, PersonaType>>({});
  const [selectedNetwork, setSelectedNetwork] = useState<"base" | "botchain">("base");
  const [copyStatus, setCopyStatus] = useState<Record<string, string>>({});

  const { ask } = useQerinAnswer();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeThread = threads.find(t => t.id === activeThreadId) ?? threads[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThread?.messages.length]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.location.hash && window.location.hash.includes("waitlist")) {
      window.history.replaceState(null, "", window.location.pathname);
    }

    try {
      const stored = localStorage.getItem(THREADS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.map((t: ChatThread) => ({
            ...t,
            messages: Array.isArray(t.messages)
              ? t.messages.filter((m: ChatMessage) => m.role !== "thinking")
              : [],
          }));
          localStorage.setItem(THREADS_STORAGE_KEY, JSON.stringify(cleaned));
          setThreads(cleaned);
        }
      } else {
        localStorage.setItem(THREADS_STORAGE_KEY, JSON.stringify(SEED_THREADS));
        localStorage.setItem(ACTIVE_THREAD_KEY, "t1");
      }
    } catch {}

    const channel = new BroadcastChannel("qerin_chat_sync");
    channel.onmessage = (e) => {
      if (e.data?.type === "SYNC_THREADS" && Array.isArray(e.data.threads)) {
        const cleaned = e.data.threads.map((t: ChatThread) => ({
          ...t,
          messages: Array.isArray(t.messages) ? t.messages.filter((m: ChatMessage) => m.role !== "thinking") : [],
        }));
        setThreads(cleaned);
        if (e.data.activeThreadId) {
          setActiveThreadId(e.data.activeThreadId);
        }
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === THREADS_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setThreads(parsed.map((t: ChatThread) => ({
              ...t,
              messages: Array.isArray(t.messages) ? t.messages.filter((m: ChatMessage) => m.role !== "thinking") : [],
            })));
          }
        } catch {}
      }
      if (e.key === ACTIVE_THREAD_KEY && e.newValue) {
        setActiveThreadId(e.newValue);
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      channel.close();
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initAccount(targetAddr?: string | null) {
      try {
        const activeAddr = targetAddr !== undefined ? targetAddr : await getConnectedWalletAddress();
        if (!isMounted) return;
        setConnectedWallet(activeAddr);
        const id = await getOrCreateAccountId(activeAddr);
        if (!isMounted) return;
        setAccountId(id);
        const b = await fetchBalance(id);
        if (!isMounted) return;
        setBalance(b);
      } catch (err) {
        console.error("Account initialization failed:", err);
      }
    }

    initAccount();

    const handleAccountSync = (e: MessageEvent) => {
      if (e.data?.type === "ACCOUNT_SYNC") {
        if (e.data.accountId) setAccountId(e.data.accountId);
        if (typeof e.data.balance === "number") setBalance(e.data.balance);
      }
    };

    const channel = new BroadcastChannel("qerin_account_sync");
    channel.addEventListener("message", handleAccountSync);

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts && accounts.length > 0) {
        initAccount(accounts[0]);
      } else {
        initAccount(null);
      }
    };

    const ethereum = typeof window !== "undefined" ? (window as unknown as { ethereum?: EthereumProvider }).ethereum : undefined;
    if (ethereum?.on) {
      ethereum.on("accountsChanged", handleAccountsChanged);
    }

    return () => {
      isMounted = false;
      channel.removeEventListener("message", handleAccountSync);
      channel.close();
      if (ethereum?.removeListener) {
        ethereum.removeListener("accountsChanged", handleAccountsChanged);
      }
    };
  }, []);

  const handleConnectWallet = async () => {
    try {
      const addr = await requestWalletConnection();
      if (addr) {
        setConnectedWallet(addr);
        const id = await getOrCreateAccountId(addr);
        setAccountId(id);
        const b = await fetchBalance(id);
        setBalance(b);
      }
    } catch (err) {
      console.error("Wallet connection error:", err);
    }
  };

  const syncAndSaveThreads = useCallback((updater: (prev: ChatThread[]) => ChatThread[]) => {
    setThreads(prev => {
      const next = updater(prev);
      if (typeof window !== "undefined") {
        try {
          const sanitized = next.map(t => ({
            ...t,
            messages: Array.isArray(t.messages)
              ? t.messages.filter(m => m.role !== "thinking")
              : [],
          }));
          localStorage.setItem(THREADS_STORAGE_KEY, JSON.stringify(sanitized));
          const channel = new BroadcastChannel("qerin_chat_sync");
          channel.postMessage({ type: "SYNC_THREADS", threads: sanitized });
          channel.close();
        } catch {}
      }
      return next;
    });
  }, []);

  const updateThread = useCallback((threadId: string, updater: (t: ChatThread) => ChatThread) => {
    syncAndSaveThreads(prev => prev.map(t => t.id === threadId ? updater(t) : t));
  }, [syncAndSaveThreads]);

  const handleNewChat = () => {
    const id = "new-" + makeId();
    const newThread: ChatThread = {
      id,
      title: "New Chat",
      preview: "",
      timeLabel: "now",
      messages: [],
      network: selectedNetwork === "base" ? "Base Mainnet" : "BOT Chain",
    };
    syncAndSaveThreads(prev => [newThread, ...prev]);
    setActiveThreadId(id);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(ACTIVE_THREAD_KEY, id);
        const channel = new BroadcastChannel("qerin_chat_sync");
        channel.postMessage({ type: "SYNC_THREADS", threads: [newThread, ...threads], activeThreadId: id });
        channel.close();
      } catch {}
    }
    setSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSelectThread = (id: string) => {
    setActiveThreadId(id);
    setSidebarOpen(false);
    setThreads(prev => {
      const hasThinking = prev.some(t => t.messages.some(m => m.role === "thinking"));
      if (!hasThinking) return prev;
      const cleaned = prev.map(t => ({
        ...t,
        messages: Array.isArray(t.messages) ? t.messages.filter(m => m.role !== "thinking") : [],
      }));
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(THREADS_STORAGE_KEY, JSON.stringify(cleaned));
        } catch {}
      }
      return cleaned;
    });
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(ACTIVE_THREAD_KEY, id);
      } catch {}
    }
  };

  const addBotChainToWallet = async () => {
    const ethereum = typeof window !== "undefined" ? (window as unknown as { ethereum?: EthereumProvider }).ethereum : undefined;
    if (ethereum) {
      try {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: "0x2A5", // 677
            chainName: "BOT Chain",
            nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
            rpcUrls: ["https://rpc.botchain.ai"],
            blockExplorerUrls: ["https://scan.botchain.ai/"],
          }],
        });
        setSelectedNetwork("botchain");
      } catch (err) {
        console.error("Could not add BOT Chain to wallet", err);
      }
    } else {
      setSelectedNetwork("botchain");
    }
  };

  const handleSubmit = async () => {
    const q = inputValue.trim();
    if (!q || isSubmitting) return;
    if (balance !== null && balance < 0.15) {
      setTopupReason("Your Agent Settlement Fuel is depleted. Fund your treasury to fuel autonomous research queries.");
      setShowTopup(true);
      return;
    }

    setInputValue("");
    setIsSubmitting(true);
    const threadId = activeThreadId;
    const userMsgId = "u-" + makeId();
    const thinkingId = "th-" + makeId();
    const time = nowTime();
    const sources = selectSourcesForDisplay(q);
    const sourceNames = sources.slice(0, 2).map(s => s.name).join(", ");

    updateThread(threadId, t => ({
      ...t,
      title: t.title === "New Chat" ? q.slice(0, 40) : t.title,
      preview: q.slice(0, 60),
      messages: [...t.messages.filter(m => m.role !== "thinking"),
        { id: userMsgId, role: "user" as const, content: q, time },
        { id: thinkingId, role: "thinking" as const, content: "", time, thinkingFor: "Agentic Layer: Settling x402 micropayments across verified intelligence sources..." },
      ],
    }));

    try {
      const result = await ask(q, accountId ?? "local", selectedNetwork === "botchain" ? "botchain" : "mainnet");
      const answerMsgId = "a-" + makeId();
      const answerTime = nowTime();

      if (result.ok) {
        const { content, receipt, rawReceipts, sourceCitations } = buildAnswerData(result.data);
        if (typeof result.data.balance === "number") setBalance(result.data.balance);

        const newTopic = result.data.topic || q.slice(0, 45);

        updateThread(threadId, t => ({
          ...t,
          title: newTopic,
          topic: newTopic,
          network: result.data.network || (selectedNetwork === "botchain" ? "BOT Chain" : "Base Mainnet"),
          messages: t.messages.filter(m => m.role !== "thinking").concat({
            id: answerMsgId,
            role: "assistant" as const,
            content,
            time: answerTime,
            receipt,
            rawReceipts,
            sourceCitations,
            topic: newTopic,
            summary: result.data.summary,
            personaInsights: result.data.personaInsights,
            question: q,
            userAccount: connectedWallet || accountId || undefined,
            costDebited: 0.15,
            remainingBalance: typeof result.data.balance === "number" ? result.data.balance : balance,
          }),
        }));
      } else if (result.reason === "insufficient_balance") {
        setTopupReason("Your Agent Settlement Fuel ran out while settling data source micropayments.");
        setShowTopup(true);
        updateThread(threadId, t => ({ ...t, messages: t.messages.filter(m => m.role !== "thinking") }));
      } else {
        updateThread(threadId, t => ({ ...t, messages: t.messages.filter(m => m.role !== "thinking").concat({ id: answerMsgId, role: "assistant" as const, content: "I couldn't retrieve verified data right now. Please try again shortly.", time: answerTime }) }));
      }
    } catch {
      const answerMsgId = "a-" + makeId();
      const answerTime = nowTime();
      updateThread(threadId, t => ({ ...t, messages: t.messages.filter(m => m.role !== "thinking").concat({ id: answerMsgId, role: "assistant" as const, content: "I encountered a connection error while gathering verified data. Please try again.", time: answerTime }) }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const handleDownloadDossier = (msg: ChatMessage) => {
    downloadDossierPdf({
      question: msg.question || activeThread.preview || "Qerin Verified Research",
      topic: msg.topic || activeThread.title,
      summary: msg.summary,
      answer: msg.content,
      personaInsights: msg.personaInsights,
      receipt: msg.rawReceipts,
      totalPaid: msg.receipt?.paid ? msg.receipt.paid.replace(" USDC", "") : "0.020",
      network: activeThread.network || (selectedNetwork === "botchain" ? "BOT Chain Mainnet" : "Base Mainnet"),
      date: msg.time,
    });
  };

  const handleCopyMarkdown = (msgId: string, msg: ChatMessage) => {
    const md = generateDossierMarkdown({
      question: msg.question || activeThread.preview || "Qerin Research",
      topic: msg.topic || activeThread.title,
      summary: msg.summary,
      answer: msg.content,
      personaInsights: msg.personaInsights,
      receipt: msg.rawReceipts,
      totalPaid: msg.receipt?.paid ? msg.receipt.paid.replace(" USDC", "") : "0.020",
      network: activeThread.network,
    });
    navigator.clipboard.writeText(md);
    setCopyStatus(prev => ({ ...prev, [msgId]: "Copied Dossier!" }));
    setTimeout(() => setCopyStatus(prev => ({ ...prev, [msgId]: "" })), 2000);
  };

  const truncatedAddr = accountId ? shortAddr(accountId) : "0x0000...0000";

  return (
    <>
      <div className={"qd-sidebar-overlay" + (sidebarOpen ? " visible" : "")} onClick={() => setSidebarOpen(false)} />
      <div className="qd-shell">

        {/* SIDEBAR */}
        <aside className={"qd-sidebar" + (sidebarOpen ? " open" : "")}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 14px 6px" }}>
            <Link href="/" title="Back to Qerin Protocol Landing Page" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
              <LogoLockup size={20} />
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Link
                href="/"
                title="View Protocol Landing Page"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  padding: "3px 7px",
                  borderRadius: 6,
                  border: "1px solid var(--qd-border)",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--qd-muted2)",
                  textDecoration: "none",
                  background: "var(--qd-surface)",
                }}
              >
                Landing ↗
              </Link>
              <button aria-label="Open in new tab" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--qd-muted2)", display: "flex", padding: 4, borderRadius: 6 }} onClick={() => window.open(window.location.href, "_blank")}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M6 2H2v10h10V8M9 1h4v4M13 1L7 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
          </div>

          <button className="qd-new-chat-btn" onClick={handleNewChat}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            New Chat
          </button>

          <div style={{ padding: "8px 12px 4px", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "var(--qd-muted2)", textTransform: "uppercase" }}>Topics & Chats</div>

          <div className="qd-chat-list">
            {threads.map(thread => {
              const isActive = thread.id === activeThreadId;
              return (
                <div key={thread.id} className={"qd-chat-item" + (isActive ? " active" : "")} onClick={() => handleSelectThread(thread.id)}>
                  <div style={{ color: isActive ? "var(--qerin-accent)" : "var(--qd-muted2)", flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 4.5h9M2.5 7.5h6M2.5 10.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><rect x="1" y="2" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.1" /></svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--qerin-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{thread.title}</div>
                    <div style={{ fontSize: 10.5, color: "var(--qd-muted2)", marginTop: 1, display: "flex", gap: 6 }}>
                      <span>{thread.timeLabel}</span>
                      <span>•</span>
                      <span>{thread.network === "botchain" ? "BOT Chain" : "Base Mainnet"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="qd-powered-card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Image src="/qerin-mark-orange.png" alt="" width={20} height={20} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--qerin-text)" }}>Qerin Agentic Engine</span>
            </div>
            <p style={{ fontSize: 12, color: "var(--qd-muted2)", margin: 0, lineHeight: 1.5 }}>Pays x402 micropayments on Base & BOT Chain. Verifiable live intelligence.</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, flexWrap: "wrap", gap: 6 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 999, background: "rgba(244,91,0,0.1)", fontSize: 11, fontWeight: 600, color: "var(--qerin-accent)" }}>
                <div className="qd-status-dot" />
                Verifiable. On-Chain.
              </div>
              <Link href="/" style={{ fontSize: 11, fontWeight: 600, color: "var(--qd-muted2)", textDecoration: "none" }}>
                Landing ↗
              </Link>
            </div>
          </div>

          <div className="qd-user-bar" onClick={() => { setTopupReason(null); setShowTopup(true); }}>
            <div style={{ position: "relative" }}>
              <Avatar letter={connectedWallet ? "W" : "U"} size={30} />
              <div
                style={{
                  position: "absolute",
                  bottom: -1,
                  right: -1,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: connectedWallet ? "#22c55e" : "#eab308",
                  border: "1.5px solid var(--qd-sidebar-bg, #0a0e17)",
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--qerin-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {connectedWallet ? "Connected Wallet" : "Web3 Identity"}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--qd-muted2)", fontFamily: "var(--font-ibm-plex-mono), monospace" }}>
                {truncatedAddr}
              </div>
            </div>
            {!connectedWallet ? (
              <button
                type="button"
                onClick={handleConnectWallet}
                style={{
                  background: "rgba(255, 107, 0, 0.12)",
                  border: "1px solid rgba(255, 107, 0, 0.35)",
                  color: "#ff7700",
                  padding: "4px 8px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  flexShrink: 0,
                }}
              >
                Connect
              </button>
            ) : (
              balance !== null && (
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--qerin-accent)", flexShrink: 0 }}>
                  ${balance.toFixed(2)}
                </div>
              )
            )}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: "var(--qd-muted2)", flexShrink: 0 }}>
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </aside>

        {/* MAIN CHAT */}
        <div className="qd-main">
          {/* Header */}
          <div className="qd-header">
            <button aria-label="Menu" onClick={() => setSidebarOpen(v => !v)} style={{ display: "none", background: "none", border: "none", cursor: "pointer", color: "var(--qerin-text)", padding: 4 }} id="qd-mobile-menu">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Link href="/" title="View Protocol Landing Page & Architecture" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
                <div style={{ position: "relative" }}>
                  <Image src="/qerin-mark-orange.png" alt="Qerin" width={32} height={32} style={{ borderRadius: 8 }} />
                  <div className="qd-status-dot" style={{ position: "absolute", bottom: -1, right: -1, width: 9, height: 9, border: "1.5px solid var(--qd-header-bg)" }} />
                </div>
              </Link>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Link href="/" title="View Protocol Landing Page & Architecture" style={{ fontWeight: 700, fontSize: 15, color: "var(--qerin-text)", textDecoration: "none" }}>Qerin</Link>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "1px 7px", borderRadius: 999, background: "rgba(34,197,94,0.12)", fontSize: 11, fontWeight: 600, color: "#16a34a" }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                    AI Agent
                  </span>
                </div>
                {activeThread?.topic && (
                  <div className="qd-topic-badge" style={{ marginTop: 2 }}>
                    <span>#</span>
                    <span>{activeThread.topic}</span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ flex: 1 }} />

            {/* Network Selector & Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Link
                href="/"
                title="View Protocol Architecture & Overview"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 9px",
                  borderRadius: 8,
                  border: "1px solid var(--qd-border)",
                  background: "var(--qd-surface)",
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: "var(--qd-muted2)",
                  textDecoration: "none",
                }}
              >
                Overview
              </Link>
              {/* Network Pill */}
              <div style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--qd-surface)", border: "1px solid var(--qd-border)", borderRadius: 8, padding: "2px 4px" }}>
                <button
                  onClick={() => setSelectedNetwork("base")}
                  style={{
                    padding: "3px 8px",
                    borderRadius: 6,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 11.5,
                    fontWeight: 600,
                    background: selectedNetwork === "base" ? "var(--qerin-accent)" : "transparent",
                    color: selectedNetwork === "base" ? "#fff" : "var(--qd-muted2)",
                  }}
                >
                  Base (8453)
                </button>
                <button
                  onClick={addBotChainToWallet}
                  title="Switch to BOT Chain Mainnet (Chain ID 677)"
                  style={{
                    padding: "3px 8px",
                    borderRadius: 6,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 11.5,
                    fontWeight: 600,
                    background: selectedNetwork === "botchain" ? "#8b5cf6" : "transparent",
                    color: selectedNetwork === "botchain" ? "#fff" : "var(--qd-muted2)",
                  }}
                >
                  BOT Chain (677)
                </button>
              </div>

              <a
                href="https://dune.com/qerin26/qerin-protocol-autonomous-ai-agent-analytics-bot-chain-hub"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 9px",
                  borderRadius: 8,
                  border: "1px solid var(--qd-border)",
                  background: "var(--qd-surface)",
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: "var(--qerin-text)",
                  textDecoration: "none",
                }}
              >
                Dune Hub ↗
              </a>

              <ThemeToggle />
            </div>
          </div>

          {/* Messages */}
          <div className="qd-messages">
            {activeThread.messages.length === 0 && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "60px 20px", textAlign: "center" }}>
                <Image src="/qerin-mark-orange.png" alt="Qerin" width={48} height={48} style={{ opacity: 0.4 }} />
                <div style={{ fontSize: 18, fontWeight: 600, color: "var(--qerin-text)", opacity: 0.5 }}>Ask anything to pay & retrieve verified live data</div>
                <div style={{ fontSize: 14, color: "var(--qd-muted2)", maxWidth: 360, lineHeight: 1.6 }}>
                  Qerin pays live micropayments on Base & BOT Chain, generates Claude Code-style topics, provides multi-persona insights, and creates downloadable research dossiers.
                </div>
              </div>
            )}

            {activeThread.messages.map((msg, idx) => {
              const isLast = idx === activeThread.messages.length - 1;
              const msgPersona = activePersona[msg.id] || "all";

              if (msg.role === "thinking") {
                if (!isSubmitting) return null;
                const cleanThinkingText = (msg.thinkingFor && !msg.thinkingFor.toLowerCase().includes("tavily") && !msg.thinkingFor.toLowerCase().includes("tably"))
                  ? msg.thinkingFor
                  : "Agentic Layer: Settling x402 micropayments across verified intelligence sources...";
                return <ThinkingBubble key={msg.id} text={cleanThinkingText} />;
              }

              if (msg.role === "user") {
                return (
                  <div key={msg.id} className={"qd-user-msg" + (isLast ? " qd-msg-enter" : "")}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--qd-muted2)" }}>
                      <span>You</span><span>{msg.time}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                      <div className="qd-user-bubble">{msg.content}</div>
                      <Avatar letter="U" size={28} />
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id} className={"qd-ai-msg" + (isLast ? " qd-msg-enter" : "")}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <QerinAvatar size={28} />
                    <div style={{ fontSize: 10, color: "var(--qd-muted2)" }}>{msg.time}</div>
                  </div>
                  <div className="qd-ai-content">
                    {/* FACTOR 1: EXECUTIVE SUMMARY BOX */}
                    {msg.summary && (
                      <div className="qd-summary-box">
                        <div className="qd-summary-header">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7 1L2 7h4l-1 4 5-6H6l1-4Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>
                          <span>Executive Summary (Verified TL;DR)</span>
                        </div>
                        <div className="qd-summary-text">
                          <MarkdownContent content={msg.summary} />
                        </div>
                      </div>
                    )}

                    {/* MAIN VERIFIED CONTENT */}
                    <div className="qd-ai-bubble">
                      <MarkdownContent content={msg.content} />
                    </div>

                    {/* FACTOR 3: MULTI-PERSONA TABS & INSIGHTS */}
                    {msg.personaInsights && (
                      <div>
                        <div className="qd-persona-tabs">
                          <button
                            className={"qd-persona-tab" + (msgPersona === "all" ? " active" : "")}
                            onClick={() => setActivePersona(prev => ({ ...prev, [msg.id]: "all" }))}
                          >
                            🌐 All Insights
                          </button>
                          <button
                            className={"qd-persona-tab" + (msgPersona === "developer" ? " active" : "")}
                            onClick={() => setActivePersona(prev => ({ ...prev, [msg.id]: "developer" }))}
                          >
                            🛠 Developer
                          </button>
                          <button
                            className={"qd-persona-tab" + (msgPersona === "founder" ? " active" : "")}
                            onClick={() => setActivePersona(prev => ({ ...prev, [msg.id]: "founder" }))}
                          >
                            🚀 Founder
                          </button>
                          <button
                            className={"qd-persona-tab" + (msgPersona === "writer" ? " active" : "")}
                            onClick={() => setActivePersona(prev => ({ ...prev, [msg.id]: "writer" }))}
                          >
                            ✍️ Writer
                          </button>
                          <button
                            className={"qd-persona-tab" + (msgPersona === "trader" ? " active" : "")}
                            onClick={() => setActivePersona(prev => ({ ...prev, [msg.id]: "trader" }))}
                          >
                            📈 Trader
                          </button>
                        </div>

                        {/* Persona-specific view */}
                        {msgPersona === "developer" && (
                          <div className="qd-persona-card">
                            <div className="qd-persona-card-badge">🛠 Developer Specification</div>
                            <div>{msg.personaInsights.developer}</div>
                          </div>
                        )}
                        {msgPersona === "founder" && (
                          <div className="qd-persona-card">
                            <div className="qd-persona-card-badge">🚀 Founder & Market Strategy</div>
                            <div>{msg.personaInsights.founder}</div>
                          </div>
                        )}
                        {msgPersona === "writer" && (
                          <div className="qd-persona-card">
                            <div className="qd-persona-card-badge">✍️ Content Hook & Editorial</div>
                            <div>{msg.personaInsights.contentWriter}</div>
                          </div>
                        )}
                        {msgPersona === "trader" && (
                          <div className="qd-persona-card">
                            <div className="qd-persona-card-badge">📈 Trader & Catalyst Signals</div>
                            <div>{msg.personaInsights.trader}</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* RECEIPT CARD */}
                    {msg.receipt && (
                      <ReceiptCard
                        receipt={msg.receipt}
                        rawReceipts={msg.rawReceipts}
                        userAccount={msg.userAccount || connectedWallet || accountId || undefined}
                        costDebited={msg.costDebited ?? 0.15}
                        remainingBalance={msg.remainingBalance ?? balance}
                      />
                    )}

                    {/* ACTION BAR: EXPORT & PDF DOWNLOAD */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, flexWrap: "wrap", gap: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button
                          className="qd-export-btn"
                          onClick={() => handleDownloadDossier(msg)}
                          title="Download high-resolution research dossier as PDF"
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 1.5h4.5L10 4v6.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.2" /><path d="M7 1.5V4h2.5M4 7h4M4 9h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                          Download PDF Dossier
                        </button>

                        <button
                          className="qd-export-btn"
                          onClick={() => handleCopyMarkdown(msg.id, msg)}
                          title="Copy full dossier in Markdown"
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="4" y="4" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" /><path d="M4 4V2a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H8" stroke="currentColor" strokeWidth="1.2" /></svg>
                          {copyStatus[msg.id] || "Copy Markdown"}
                        </button>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <button className="qd-icon-btn" aria-label="Copy raw answer" onClick={() => navigator.clipboard.writeText(msg.content)}>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="4" y="4" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" /><path d="M4 4V2a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H8" stroke="currentColor" strokeWidth="1.2" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="qd-input-area">
            <div className="qd-input-wrapper">
              <button className="qd-icon-btn" aria-label="Attach" style={{ width: 28, height: 28, border: "none", flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M12.5 6.5L6.5 12.5a3.5 3.5 0 0 1-5-5L7 2a2 2 0 0 1 3 3L4 11a.5.5 0 0 1-.7-.7L9.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <textarea
                ref={inputRef}
                className="qd-input"
                rows={1}
                placeholder="Ask anything... Qerin pays micropayments and verifies on-chain"
                value={inputValue}
                onChange={e => { setInputValue(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
                onKeyDown={handleKeyDown}
                disabled={isSubmitting}
                style={{ maxHeight: 120 }}
              />
              <button className="qd-send-btn" aria-label="Send" onClick={handleSubmit} disabled={!inputValue.trim() || isSubmitting}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 12V2M3 6l4-4 4 4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11.5, color: "var(--qd-muted2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="4" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1" /><path d="M4 4V3a2 2 0 0 1 4 0v1" stroke="currentColor" strokeWidth="1" strokeLinecap="round" /></svg>
                <span>Settling via <strong>{selectedNetwork === "base" ? "Base (USDC)" : "BOT Chain (USDT/BOT)"}</strong></span>
              </div>
              <span>$0.15 / answer</span>
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "7px 20px", borderTop: "1px solid var(--qd-footer-border)", fontSize: 11, color: "var(--qd-muted2)" }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><rect x="0.5" y="3.5" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1" /><path d="M3 3.5V2.5a2.5 2.5 0 0 1 5 0v1" stroke="currentColor" strokeWidth="1" strokeLinecap="round" /></svg>
            All answers backed by on-chain x402 payment receipts on Base & BOT Chain.
          </div>
        </div>
      </div>

      {showTopup && accountId && (
        <TopupModal
          accountId={accountId}
          initialNetwork={selectedNetwork}
          reason={topupReason}
          onClose={() => setShowTopup(false)}
          onCredited={(b) => setBalance(b)}
        />
      )}

      <style>{`@media (max-width: 767px) { #qd-mobile-menu { display: flex !important; } }`}</style>
    </>
  );
}
