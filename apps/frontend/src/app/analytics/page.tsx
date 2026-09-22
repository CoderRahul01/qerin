import Link from "next/link";
import { Nav } from "@/components/Nav";
import { ProtocolAnalytics } from "@/components/ProtocolAnalytics";
import { BotChainProofFooter } from "@/components/BotChainProofFooter";

export const metadata = {
  title: "Qerin Protocol Analytics",
  description: "Verifiable Qerin paid-research growth metrics.",
};

export default function AnalyticsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--qerin-bg)" }}>
      <Nav />
      <main style={{ width: "100%", maxWidth: 1040, margin: "0 auto", padding: "48px 24px 40px" }}>
        <div style={{ maxWidth: 720 }}>
          <p style={{ margin: 0, color: "var(--qerin-accent)", fontFamily: "var(--font-ibm-plex-mono), monospace", fontWeight: 700, fontSize: 12, letterSpacing: "0.07em" }}>PROTOCOL GROWTH</p>
          <h1 style={{ margin: "12px 0 0", color: "var(--qerin-text)", fontSize: "clamp(32px, 5vw, 54px)", lineHeight: 1.05, letterSpacing: "-0.045em" }}>Growth that can be inspected.</h1>
          <p style={{ margin: "16px 0 0", color: "var(--qerin-text-muted)", lineHeight: 1.65, fontSize: 16 }}>
            Qerin reports completed paid research activity, actual source spend, and aggregate account participation. The dashboard excludes failed requests, free enrichment, individual wallets, and research questions.
          </p>
        </div>

        <div style={{ marginTop: 30 }}><ProtocolAnalytics /></div>

        <section style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/app" style={{ minHeight: 44, display: "inline-flex", alignItems: "center", padding: "0 18px", borderRadius: 9, background: "var(--qerin-accent)", color: "var(--qerin-accent-contrast)", fontWeight: 700, textDecoration: "none" }}>Launch Qerin →</Link>
          <a href="https://dune.com/qerin26/qerin-protocol-autonomous-ai-agent-analytics-bot-chain-hub" target="_blank" rel="noreferrer" style={{ minHeight: 44, display: "inline-flex", alignItems: "center", padding: "0 18px", borderRadius: 9, border: "1px solid var(--qerin-border)", color: "var(--qerin-text)", fontWeight: 700, textDecoration: "none" }}>Inspect Dune ↗</a>
        </section>

        <BotChainProofFooter />
      </main>
    </div>
  );
}
