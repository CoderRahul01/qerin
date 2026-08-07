export function LogoRow({ padding, marginTop }: { padding: string; marginTop?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding, marginTop }}>
      <div style={{ width: 14, height: 14, background: "#0000FF", flexShrink: 0 }} />
      <div style={{ fontWeight: 700, fontSize: 15, color: "#12141A" }}>qerin</div>
    </div>
  );
}

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return <div className="qerin-app-shell">{children}</div>;
}
