import { LogoLockup } from "@/components/LogoMark";
import { ThemeToggle } from "@/components/ThemeToggle";

const links = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#for-builders", label: "For builders" },
  { href: "#proof", label: "Proof" },
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
        <a href="#top" style={{ textDecoration: "none" }}>
          <LogoLockup size={22} />
        </a>

        <nav className="qerin-nav-links" aria-label="Section">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
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
            href="#waitlist"
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
            Join waitlist
          </a>
        </div>
      </div>
    </header>
  );
}
