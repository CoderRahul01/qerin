import { Nav } from "@/components/Nav";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const metadata = {
  title: "Qerin Founder Analytics",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--qerin-bg)" }}>
      <Nav />
      <main style={{ width: "100%", maxWidth: 1080, margin: "0 auto", padding: "36px 16px 48px", boxSizing: "border-box" }}>
        <p style={{ margin: 0, color: "var(--qerin-accent)", fontFamily: "var(--font-ibm-plex-mono), monospace", fontWeight: 700, fontSize: 12, letterSpacing: "0.07em" }}>PRIVATE · FOUNDER VIEW</p>
        <h1 style={{ margin: "10px 0 18px", color: "var(--qerin-text)", fontSize: "clamp(28px, 4vw, 40px)", letterSpacing: "-0.04em" }}>Growth analytics</h1>
        <AdminDashboard />
      </main>
    </div>
  );
}
