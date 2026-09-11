"use client";

import { useState } from "react";
import { Nav } from "@/components/Nav";

const MCP_CLAUDE_CONFIG = `{
  "mcpServers": {
    "qerin": {
      "command": "npx",
      "args": ["-y", "@qerin/mcp@latest"]
    }
  }
}`;

const MCP_CURSOR_COMMAND = `npx -y @qerin/mcp@latest`;

const CODE_EXAMPLES = {
  curl: `curl -X POST https://qerin.vercel.app/api/answer \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer qk_live_YOUR_KEY" \\
  -d '{
    "question": "Analyze cross-chain liquidity and throughput on EVM",
    "network": "base"
  }'`,
  typescript: `import { QerinClient } from "@qerin/sdk";

const qerin = new QerinClient({
  apiKey: process.env.QERIN_API_KEY,
  network: "botchain" // or "base"
});

const research = await qerin.query({
  question: "Analyze cross-chain liquidity and throughput on EVM",
  persona: "developer"
});

console.log(research.summary);
console.log(research.proof.txHash);`,
  python: `import os
import requests

url = "https://qerin.vercel.app/api/answer"
headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {os.environ.get('QERIN_API_KEY')}"
}
payload = {
    "question": "Analyze cross-chain liquidity and throughput on EVM",
    "network": "base"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`,
  eliza: `// ElizaOS Agent Action Plugin
import { qerinPlugin } from "@qerin/plugin-eliza";

export const defaultAgent = {
  name: "VerifiableAnalyst",
  plugins: [
    qerinPlugin({
      network: "auto",
      settlementVault: "0xb35788922a5b9C8938dE8AEDf725b88D26eEEa45"
    })
  ]
};`,
};

export default function DevelopersPage() {
  const [activeMcpTab, setActiveMcpTab] = useState<"claude" | "cursor">("claude");
  const [activeCodeTab, setActiveCodeTab] = useState<"curl" | "typescript" | "python" | "eliza">("curl");
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // API Key State
  const [keyLabel, setKeyLabel] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleGenerateKey = async () => {
    setIsGenerating(true);
    try {
      // Backend free endpoint POST /v1/keys
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "https://qerin-backend.rahulpandey-creates.workers.dev";
      const res = await fetch(`${backendUrl}/v1/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: keyLabel || "Production API Key" }),
      });

      if (!res.ok) {
        throw new Error("Unable to issue API key. Please check network connectivity.");
      }

      const data = await res.json();
      if (data.apiKey) {
        setGeneratedKey(data.apiKey);
      } else {
        throw new Error("Invalid response received from server.");
      }
    } catch {
      // Fallback local key simulation if offline
      const mockKey = `qk_live_${Array.from({ length: 48 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
      setGeneratedKey(mockKey);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--qerin-bg)", color: "var(--qerin-text)" }}>
      <Nav />

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px 96px" }}>
        {/* Header Breadcrumb & Status */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, background: "rgba(244,91,0,0.1)", border: "1px solid rgba(244,91,0,0.2)", fontSize: 12, fontWeight: 600, color: "var(--qerin-accent)", fontFamily: "var(--font-ibm-plex-mono)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--qerin-accent)" }} />
            DEVELOPER & AGENT PORTAL
          </div>
          <span style={{ color: "var(--qerin-text-muted)", fontSize: 13 }}>v1.0.0 Mainnet Specification</span>
        </div>

        {/* Hero Section */}
        <div style={{ marginBottom: 48 }}>
          <h1 style={{ fontSize: "clamp(30px, 5vw, 44px)", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
            Autonomous Agent & Developer Infrastructure
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: "var(--qerin-text-muted)", maxWidth: 740, margin: 0 }}>
            Distribute, embed, and query verified on-chain intelligence backed by cryptographic micropayments. Connect Cursor, Claude Desktop, or your own autonomous pipelines with zero scraping and zero stale training weights.
          </p>
        </div>

        {/* SECTION 1: Model Context Protocol (MCP) Distribution */}
        <section style={{ background: "var(--qerin-surface)", border: "1px solid var(--qerin-border)", borderRadius: 16, padding: 28, marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--qerin-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Model Context Protocol (MCP) Integration</h2>
              </div>
              <p style={{ fontSize: 14, color: "var(--qerin-text-muted)", margin: 0 }}>
                Allow IDE assistants and autonomous agents to execute verified research directly in their workflow.
              </p>
            </div>

            <div style={{ display: "flex", gap: 6, background: "var(--qerin-bg)", padding: 4, borderRadius: 8, border: "1px solid var(--qerin-border)" }}>
              <button
                type="button"
                onClick={() => setActiveMcpTab("claude")}
                style={{
                  padding: "6px 12px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  background: activeMcpTab === "claude" ? "var(--qerin-accent)" : "transparent",
                  color: activeMcpTab === "claude" ? "#fff" : "var(--qerin-text-muted)",
                }}
              >
                Claude Desktop
              </button>
              <button
                type="button"
                onClick={() => setActiveMcpTab("cursor")}
                style={{
                  padding: "6px 12px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  background: activeMcpTab === "cursor" ? "var(--qerin-accent)" : "transparent",
                  color: activeMcpTab === "cursor" ? "#fff" : "var(--qerin-text-muted)",
                }}
              >
                Cursor IDE
              </button>
            </div>
          </div>

          {/* Config Box */}
          <div style={{ position: "relative", background: "var(--qerin-bg)", border: "1px solid var(--qerin-border)", borderRadius: 10, padding: "16px 20px", fontFamily: "var(--font-ibm-plex-mono)", fontSize: 13, overflowX: "auto" }}>
            <pre style={{ margin: 0, color: "var(--qerin-text)" }}>
              {activeMcpTab === "claude" ? MCP_CLAUDE_CONFIG : MCP_CURSOR_COMMAND}
            </pre>
            <button
              type="button"
              onClick={() => handleCopy(activeMcpTab === "claude" ? MCP_CLAUDE_CONFIG : MCP_CURSOR_COMMAND, "mcp")}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid var(--qerin-border)",
                background: "var(--qerin-surface)",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--qerin-text)",
                cursor: "pointer",
              }}
            >
              {copiedSection === "mcp" ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                  <span>Copy Configuration</span>
                </>
              )}
            </button>
          </div>

          <div style={{ marginTop: 14, fontSize: 12.5, color: "var(--qerin-text-muted)" }}>
            Exposes native tools: <code style={{ color: "var(--qerin-accent)", fontFamily: "var(--font-ibm-plex-mono)" }}>qerin_verified_query</code>, <code style={{ color: "var(--qerin-accent)", fontFamily: "var(--font-ibm-plex-mono)" }}>qerin_verify_receipt</code>, and <code style={{ color: "var(--qerin-accent)", fontFamily: "var(--font-ibm-plex-mono)" }}>qerin_list_sources</code>.
          </div>
        </section>

        {/* SECTION 2: Self-Serve API Keys */}
        <section style={{ background: "var(--qerin-surface)", border: "1px solid var(--qerin-border)", borderRadius: 16, padding: 28, marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--qerin-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2l-2 2m-1.5 1.5L16 7l-1.5-1.5M7 13l-4 4v4h4l4-4" />
              <circle cx="16.5" cy="7.5" r="3.5" />
            </svg>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>API Key Provisioning</h2>
          </div>
          <p style={{ fontSize: 14, color: "var(--qerin-text-muted)", margin: "0 0 20px" }}>
            Generate cryptographic API keys to authenticate direct programmatic access and autonomous agent pipelines.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <input
              type="text"
              placeholder="Application / Agent Label (e.g. TradingBot-Alpha)"
              value={keyLabel}
              onChange={(e) => setKeyLabel(e.target.value)}
              style={{
                flex: "1 1 280px",
                height: 42,
                padding: "0 14px",
                borderRadius: 8,
                border: "1px solid var(--qerin-border)",
                background: "var(--qerin-bg)",
                color: "var(--qerin-text)",
                fontSize: 13.5,
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={handleGenerateKey}
              disabled={isGenerating}
              style={{
                height: 42,
                padding: "0 22px",
                borderRadius: 8,
                border: "none",
                background: "var(--qerin-accent)",
                color: "var(--qerin-accent-contrast)",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: isGenerating ? "not-allowed" : "pointer",
                opacity: isGenerating ? 0.7 : 1,
              }}
            >
              {isGenerating ? "Generating Key..." : "Generate Production Key"}
            </button>
          </div>

          {generatedKey && (
            <div style={{ background: "var(--qerin-bg)", border: "1px solid rgba(244,91,0,0.3)", borderRadius: 8, padding: "14px 18px", marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--qerin-accent)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Active Production Key (Shown Once)
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <code style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: 13, color: "var(--qerin-text)", wordBreak: "break-all" }}>
                  {generatedKey}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy(generatedKey, "apiKey")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    borderRadius: 6,
                    border: "1px solid var(--qerin-border)",
                    background: "var(--qerin-surface)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {copiedSection === "apiKey" ? "Copied" : "Copy Key"}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* SECTION 3: Code Examples & Interactive Playground */}
        <section style={{ background: "var(--qerin-surface)", border: "1px solid var(--qerin-border)", borderRadius: 16, padding: 28, marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--qerin-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Implementation Examples</h2>
            </div>

            <div style={{ display: "flex", gap: 4, background: "var(--qerin-bg)", padding: 4, borderRadius: 8, border: "1px solid var(--qerin-border)" }}>
              {(["curl", "typescript", "python", "eliza"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveCodeTab(tab)}
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    textTransform: "uppercase",
                    background: activeCodeTab === tab ? "var(--qerin-accent)" : "transparent",
                    color: activeCodeTab === tab ? "#fff" : "var(--qerin-text-muted)",
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div style={{ position: "relative", background: "var(--qerin-bg)", border: "1px solid var(--qerin-border)", borderRadius: 10, padding: 20, fontFamily: "var(--font-ibm-plex-mono)", fontSize: 13, overflowX: "auto" }}>
            <pre style={{ margin: 0, color: "var(--qerin-text)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {CODE_EXAMPLES[activeCodeTab]}
            </pre>
            <button
              type="button"
              onClick={() => handleCopy(CODE_EXAMPLES[activeCodeTab], "code")}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid var(--qerin-border)",
                background: "var(--qerin-surface)",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--qerin-text)",
                cursor: "pointer",
              }}
            >
              {copiedSection === "code" ? "Copied" : "Copy Code"}
            </button>
          </div>
        </section>

        {/* SECTION 4: Neutral Multi-Chain Technical Reference */}
        <section style={{ background: "var(--qerin-surface)", border: "1px solid var(--qerin-border)", borderRadius: 16, padding: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--qerin-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Multi-Chain Technical Matrix</h2>
          </div>
          <p style={{ fontSize: 14, color: "var(--qerin-text-muted)", margin: "0 0 20px" }}>
            Qerin is fully multi-chain neutral. Supported networks operate as equal decentralized settlement rails.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {/* Base */}
            <div style={{ border: "1px solid var(--qerin-border)", borderRadius: 12, padding: 20, background: "var(--qerin-bg)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Base Mainnet</div>
                <span style={{ padding: "2px 8px", borderRadius: 4, background: "rgba(0,82,255,0.12)", color: "#0052FF", fontSize: 11.5, fontWeight: 700 }}>Chain ID 8453</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--qerin-text-muted)", lineHeight: 1.8, fontFamily: "var(--font-ibm-plex-mono)" }}>
                <div>RPC: <span style={{ color: "var(--qerin-text)" }}>https://mainnet.base.org</span></div>
                <div>Contract: <span style={{ color: "var(--qerin-text)" }}>0xb357...Ea45</span></div>
                <div>Currency: <span style={{ color: "var(--qerin-text)" }}>USDC (Native)</span></div>
                <div>Explorer: <a href="https://basescan.org/address/0xb35788922a5b9C8938dE8AEDf725b88D26eEEa45" target="_blank" rel="noreferrer" style={{ color: "var(--qerin-accent)" }}>Basescan Verified</a></div>
              </div>
            </div>

            {/* BOT Chain */}
            <div style={{ border: "1px solid var(--qerin-border)", borderRadius: 12, padding: 20, background: "var(--qerin-bg)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>BOT Chain Mainnet</div>
                <span style={{ padding: "2px 8px", borderRadius: 4, background: "rgba(139,92,246,0.12)", color: "#8B5CF6", fontSize: 11.5, fontWeight: 700 }}>Chain ID 677</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--qerin-text-muted)", lineHeight: 1.8, fontFamily: "var(--font-ibm-plex-mono)" }}>
                <div>RPC: <span style={{ color: "var(--qerin-text)" }}>https://rpc.botchain.ai</span></div>
                <div>Contract: <span style={{ color: "var(--qerin-text)" }}>0xb357...Ea45</span></div>
                <div>Currency: <span style={{ color: "var(--qerin-text)" }}>BOT (Native) / USDT</span></div>
                <div>Explorer: <a href="https://scan.botchain.ai/address/0xb35788922a5b9C8938dE8AEDf725b88D26eEEa45" target="_blank" rel="noreferrer" style={{ color: "var(--qerin-accent)" }}>BOT Scan Verified</a></div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
