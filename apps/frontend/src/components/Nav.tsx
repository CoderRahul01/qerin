import Link from "next/link";
import { LogoLockup } from "@/components/LogoMark";
import { ThemeToggle } from "@/components/ThemeToggle";

const links = [
  { href: "/app", label: "Terminal" },
  { href: "/developers", label: "Developers & MCP" },
  { href: "/rewards", label: "Rewards & Points" },
  { href: "https://dune.com/qerin26/qerin-protocol-autonomous-ai-agent-analytics-bot-chain-hub", label: "Dune Analytics ↗" },
];

export function Nav() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: "var(--qerin-bg)",
        borderBottom: "1px solid var(--qerin-border)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 880,
          margin: "0 auto",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <Link href="/" style={{ textDecoration: "none" }}>
          <LogoLockup size={22} />
        </Link>

        <nav className="qerin-nav-links" aria-label="Section">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel={link.href.startsWith("http") ? "noreferrer" : undefined}
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "var(--qerin-text-muted)",
                textDecoration: "none",
              }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ThemeToggle />
          <a
            href="/app"
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 36,
              padding: "0 18px",
              borderRadius: 9999,
              background: "var(--qerin-accent)",
              color: "var(--qerin-accent-contrast)",
              fontWeight: 600,
              fontSize: 13.5,
              textDecoration: "none",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            Launch App →
          </a>
        </div>
      </div>
    </header>
  );
}

