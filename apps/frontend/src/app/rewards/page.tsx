"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { getOrCreateAccountId } from "@/lib/account";

const REWARD_ACTIVITIES = [
  {
    title: "Execute Verified Query",
    reward: "+10 VIP",
    description: "Submit an inquiry that settles real x402 micropayments to publishers on Base or BOT Chain.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--qerin-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    title: "Refer Active Researcher",
    reward: "+50 VIP",
    description: "Invite a developer, founder, or analyst who executes their first verified inquiry.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--qerin-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="22" y1="11" x2="16" y2="11" />
      </svg>
    ),
  },
  {
    title: "Share Cryptographic Proof",
    reward: "+5 VIP",
    description: "Export and publish verified audit cards to X (Twitter), Farcaster, or research forums.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--qerin-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <polyline points="16 6 12 2 8 6" />
        <line x1="12" y1="2" x2="12" y2="15" />
      </svg>
    ),
  },
  {
    title: "Programmatic Agent Call",
    reward: "+2 VIP",
    description: "Automate queries via the Qerin MCP Server or B2B API keys in external applications.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--qerin-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" />
        <line x1="9" y1="1" x2="9" y2="4" />
        <line x1="15" y1="1" x2="15" y2="4" />
      </svg>
    ),
  },
];

const TIERS = [
  { name: "Protocol Explorer", range: "0 - 250 VIP", perk: "Base receipt registry access" },
  { name: "Verified Researcher", range: "250 - 1,000 VIP", perk: "10% Gas rebate bonus & priority indexing" },
  { name: "Autonomous Operator", range: "1,000 - 5,000 VIP", perk: "25% Gas rebate & direct publisher channel access" },
  { name: "Council Partner", range: "5,000+ VIP", perk: "Up to 35% ecosystem grant gas rebate & custom quotas" },
];

export default function RewardsPage() {
  const [accountId, setAccountId] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [userPoints] = useState<number>(() => {
    if (typeof window === "undefined") return 120;
    try {
      const stored = localStorage.getItem("qerin_vip_points");
      return stored ? parseInt(stored, 10) : 120;
    } catch {
      return 120;
    }
  });
  const [referralCount] = useState<number>(() => {
    if (typeof window === "undefined") return 2;
    try {
      const stored = localStorage.getItem("qerin_referral_count");
      return stored ? parseInt(stored, 10) : 2;
    } catch {
      return 2;
    }
  });

  useEffect(() => {
    let mounted = true;
    getOrCreateAccountId().then((id) => {
      if (mounted && id) {
        setAccountId(id);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const referralUrl = typeof window !== "undefined"
    ? `${window.location.origin}/app?ref=${accountId.slice(0, 12)}`
    : `https://qerin.vercel.app/app?ref=${accountId.slice(0, 12)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--qerin-bg)", color: "var(--qerin-text)" }}>
      <Nav />

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px 96px" }}>
        {/* Breadcrumb / Tag */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, background: "rgba(244,91,0,0.1)", border: "1px solid rgba(244,91,0,0.2)", fontSize: 12, fontWeight: 600, color: "var(--qerin-accent)", fontFamily: "var(--font-ibm-plex-mono)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--qerin-accent)" }} />
            ECOSYSTEM REWARDS & INCENTIVE PROGRAM
          </div>
          <span style={{ color: "var(--qerin-text-muted)", fontSize: 13 }}>Multi-Chain Neutral</span>
        </div>

        {/* Hero */}
        <div style={{ marginBottom: 44 }}>
          <h1 style={{ fontSize: "clamp(30px, 5vw, 44px)", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
            Verifiable Intelligence Points (VIP)
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: "var(--qerin-text-muted)", maxWidth: 740, margin: 0 }}>
            Earn non-custodial protocol points by executing verified research inquiries, distributing cryptographic audit cards, referring active analysts, and building autonomous agent pipelines.
          </p>
        </div>

        {/* User Balance & Referral Card */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 40 }}>
          {/* Points Overview Card */}
          <div style={{ background: "var(--qerin-surface)", border: "1px solid var(--qerin-border)", borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--qerin-text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Accumulated Points
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 44, fontWeight: 800, color: "var(--qerin-accent)", letterSpacing: "-0.03em" }}>{userPoints}</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--qerin-text)" }}>VIP</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--qerin-text-muted)", lineHeight: 1.5 }}>
              Current Rank: <strong style={{ color: "var(--qerin-text)" }}>Verified Researcher (Tier 2)</strong>. Unlocks prioritized publisher routing and 10% gas rebate status.
            </div>
          </div>

          {/* Referral Engine Card */}
          <div style={{ background: "var(--qerin-surface)", border: "1px solid var(--qerin-border)", borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--qerin-text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Your Referral Link
            </div>
            <p style={{ fontSize: 13, color: "var(--qerin-text-muted)", margin: "0 0 14px" }}>
              Share your link with analysts, founders, or developers. Earn +50 VIP for each referee&apos;s first verified query.
            </p>

            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                readOnly
                value={referralUrl}
                style={{
                  flex: 1,
                  height: 38,
                  padding: "0 12px",
                  borderRadius: 8,
                  border: "1px solid var(--qerin-border)",
                  background: "var(--qerin-bg)",
                  color: "var(--qerin-text)",
                  fontSize: 12.5,
                  fontFamily: "var(--font-ibm-plex-mono)",
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={handleCopy}
                style={{
                  height: 38,
                  padding: "0 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--qerin-accent)",
                  color: "var(--qerin-accent-contrast)",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {copiedLink ? "Copied" : "Copy Link"}
              </button>
            </div>

            <div style={{ marginTop: 12, fontSize: 12, color: "var(--qerin-text-muted)" }}>
              Active Referrals: <strong style={{ color: "var(--qerin-text)" }}>{referralCount}</strong> | Total Earned: <strong style={{ color: "var(--qerin-accent)" }}>+{referralCount * 50} VIP</strong>
            </div>
          </div>
        </section>

        {/* Earning Matrix */}
        <section style={{ background: "var(--qerin-surface)", border: "1px solid var(--qerin-border)", borderRadius: 16, padding: 28, marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--qerin-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Points Earning Activities</h2>
          </div>
          <p style={{ fontSize: 14, color: "var(--qerin-text-muted)", margin: "0 0 24px" }}>
            Every interaction is cryptographically recorded on-chain or registered in the anonymous ledger.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            {REWARD_ACTIVITIES.map((act) => (
              <div key={act.title} style={{ background: "var(--qerin-bg)", border: "1px solid var(--qerin-border)", borderRadius: 12, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {act.icon}
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{act.title}</div>
                  </div>
                  <span style={{ fontFamily: "var(--font-ibm-plex-mono)", fontSize: 12, fontWeight: 700, color: "var(--qerin-accent)", background: "rgba(244,91,0,0.1)", padding: "2px 8px", borderRadius: 4 }}>
                    {act.reward}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "var(--qerin-text-muted)", lineHeight: 1.5, margin: 0 }}>
                  {act.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Tier Progression */}
        <section style={{ background: "var(--qerin-surface)", border: "1px solid var(--qerin-border)", borderRadius: 16, padding: 28, marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--qerin-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Tier Progression & Gas Rebates</h2>
          </div>
          <p style={{ fontSize: 14, color: "var(--qerin-text-muted)", margin: "0 0 20px" }}>
            Advancing your tier unlocks higher ecosystem support grants and gas rebate coverage (up to 35%).
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            {TIERS.map((tier, idx) => (
              <div key={tier.name} style={{ background: "var(--qerin-bg)", border: "1px solid var(--qerin-border)", borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--qerin-accent)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                  Tier 0{idx + 1}
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{tier.name}</div>
                <div style={{ fontSize: 12, fontFamily: "var(--font-ibm-plex-mono)", color: "var(--qerin-text-muted)", marginBottom: 8 }}>{tier.range}</div>
                <div style={{ fontSize: 12, color: "var(--qerin-text-muted)", lineHeight: 1.4 }}>{tier.perk}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Multi-Chain Settlement Status */}
        <section style={{ border: "1px solid var(--qerin-border)", borderRadius: 16, padding: 24, background: "var(--qerin-surface)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Live On-Chain Settlement Hub</div>
              <div style={{ fontSize: 13, color: "var(--qerin-text-muted)" }}>
                View all verifiable audit records, network throughput metrics, and real-time query volume.
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <Link
                href="/app"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: 38,
                  padding: "0 18px",
                  borderRadius: 8,
                  background: "var(--qerin-accent)",
                  color: "var(--qerin-accent-contrast)",
                  fontWeight: 600,
                  fontSize: 13,
                  textDecoration: "none",
                }}
              >
                Launch Terminal →
              </Link>
              <a
                href="https://dune.com/qerin26/qerin-protocol-autonomous-ai-agent-analytics-bot-chain-hub"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: 38,
                  padding: "0 16px",
                  borderRadius: 8,
                  border: "1px solid var(--qerin-border)",
                  background: "var(--qerin-bg)",
                  color: "var(--qerin-text)",
                  fontWeight: 600,
                  fontSize: 13,
                  textDecoration: "none",
                }}
              >
                Dune Analytics ↗
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
