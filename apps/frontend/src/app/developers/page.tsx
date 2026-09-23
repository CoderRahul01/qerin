"use client";

import { Nav } from "@/components/Nav";

export default function DevelopersPage() {


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
          <span style={{ color: "var(--qerin-text-muted)", fontSize: 13 }}>Early access</span>
        </div>

        {/* Hero Section */}
        <div style={{ marginBottom: 48 }}>
          <h1 style={{ fontSize: "clamp(30px, 5vw, 44px)", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
            Autonomous Agent & Developer Infrastructure
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: "var(--qerin-text-muted)", maxWidth: 740, margin: 0 }}>
            Qerin pays selected sources for research and shows payment evidence when a query succeeds. Direct x402 access and MCP paid queries are paused during early access.
          </p>
        </div>

        <section style={{ background: "var(--qerin-surface)", border: "1px solid var(--qerin-border)", borderRadius: 16, padding: 28, marginBottom: 40 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 10px" }}>Developer access</h2>
          <p style={{ fontSize: 14, color: "var(--qerin-text-muted)", lineHeight: 1.6, margin: 0 }}>
            Direct API billing is paused while we finish automatic refunds for failed answers. API keys and MCP paid queries are also unavailable. The web app is open for early-access research using a personal Qerin balance.
          </p>
          <a href="/app" style={{ display: "inline-block", marginTop: 16, color: "var(--qerin-accent)", fontWeight: 600 }}>Open Qerin app →</a>
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
            Users can top up on supported rails. Paid source requests currently settle in Base USDC.
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
                <div>Explorer: <a href="https://basescan.org/address/0xb35788922a5b9C8938dE8AEDf725b88D26eEEa45" target="_blank" rel="noreferrer" style={{ color: "var(--qerin-accent)" }}>View contract</a></div>
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
                <div>Explorer: <a href="https://scan.botchain.ai/address/0xb35788922a5b9C8938dE8AEDf725b88D26eEEa45" target="_blank" rel="noreferrer" style={{ color: "var(--qerin-accent)" }}>View contract</a></div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
