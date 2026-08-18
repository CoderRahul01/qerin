import { LogoLockup } from "@/components/LogoMark";

export function LogoRow({ padding, marginTop }: { padding: string; marginTop?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding, marginTop }}>
      <LogoLockup size={22} />
    </div>
  );
}

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return <div className="qerin-app-shell">{children}</div>;
}
