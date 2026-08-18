import { useId, type ReactNode } from "react";

const GRADIENTS: Record<string, { from: string; to: string }> = {
  orange: { from: "#FF9A5C", to: "#F45B00" },
  neutral: { from: "#3A3A3A", to: "#151515" },
  success: { from: "#3FB07A", to: "#1B7A4A" },
};

export function DimensionalBadge({
  tone = "orange",
  icon,
  pulse = false,
  size = 56,
}: {
  tone?: "orange" | "neutral" | "success";
  icon: ReactNode;
  pulse?: boolean;
  size?: number;
}) {
  const id = `qerin-badge-grad-${useId()}`;
  const grad = GRADIENTS[tone];

  return (
    <div
      className="qerin-badge-float"
      style={{ width: size, height: size, position: "relative", flexShrink: 0 }}
    >
      {pulse && <span className="qerin-badge-pulse-ring" aria-hidden="true" />}
      <svg width={size} height={size} viewBox="0 0 56 56" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={grad.from} />
            <stop offset="100%" stopColor={grad.to} />
          </linearGradient>
          <filter id={`${id}-shadow`} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#000000" floodOpacity="0.2" />
          </filter>
        </defs>
        <g filter={`url(#${id}-shadow)`}>
          <rect x="4" y="4" width="48" height="48" rx="14" fill={`url(#${id})`} />
        </g>
        <path d="M8 14a12 12 0 0 1 10-10h6a24 24 0 0 0-16 16v-6Z" fill="#ffffff" opacity="0.14" />
        <g stroke="#ffffff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </g>
      </svg>
    </div>
  );
}
