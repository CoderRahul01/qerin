import Image from "next/image";

const SRC = {
  orange: "/qerin-mark-orange.png",
  white: "/qerin-mark-white.png",
} as const;

export function LogoMark({
  variant = "orange",
  size = 24,
}: {
  variant?: "orange" | "white";
  size?: number;
}) {
  return (
    <Image
      src={SRC[variant]}
      alt=""
      width={size}
      height={size}
      priority
      style={{ display: "block", flexShrink: 0 }}
    />
  );
}

export function LogoLockup({
  variant = "orange",
  size = 24,
  textColor,
}: {
  variant?: "orange" | "white";
  size?: number;
  textColor?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.32 }}>
      <LogoMark variant={variant} size={size} />
      <span
        style={{
          fontFamily: "var(--font-space-grotesk), var(--font-inter), sans-serif",
          fontWeight: 700,
          fontSize: size * 0.72,
          color: textColor ?? "var(--qerin-text)",
          letterSpacing: "-0.01em",
        }}
      >
        Qerin
      </span>
    </div>
  );
}
