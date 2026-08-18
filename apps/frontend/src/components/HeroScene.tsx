const PED_TOP = "#2A2A2A";
const PED_BODY = "#1E1E1E";
const PED_BOTTOM = "#141414";

function FlowPath({ d }: { d: string }) {
  return (
    <path
      d={d}
      stroke="var(--qerin-accent)"
      strokeWidth="2"
      strokeDasharray="1 8"
      strokeLinecap="round"
      fill="none"
      opacity="0.65"
      className="qerin-hero-flow"
    />
  );
}

export function HeroScene() {
  return (
    <svg
      viewBox="0 0 640 340"
      role="img"
      aria-label="An AI agent, connected to the Qerin mark, pays USDC on Base and returns an on-chain receipt"
      style={{ display: "block", width: "100%", height: "auto", overflow: "visible" }}
    >
      <defs>
        <radialGradient id="qerin-hero-glow" cx="46%" cy="52%" r="65%">
          <stop offset="0%" stopColor="var(--qerin-accent)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--qerin-accent)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="qerin-cube-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF9A5C" />
          <stop offset="100%" stopColor="#F45B00" />
        </linearGradient>
        <linearGradient id="qerin-coin-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F4F4F4" />
          <stop offset="100%" stopColor="#C7C7C7" />
        </linearGradient>
        <filter id="qerin-hero-shadow" x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#000000" floodOpacity="0.22" />
        </filter>
        <filter id="qerin-ground-blur" x="-40%" y="-200%" width="180%" height="500%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>

      <ellipse cx="320" cy="180" rx="300" ry="190" fill="url(#qerin-hero-glow)" />

      {/* Shared ground shadow */}
      <ellipse cx="320" cy="308" rx="290" ry="14" fill="#000000" opacity="0.16" filter="url(#qerin-ground-blur)" />

      {/* Flow line — a single path, broken only where it passes behind a solid node */}
      <FlowPath d="M126 224 C 165 240, 195 262, 226 274" />
      <FlowPath d="M234 274 C 265 258, 280 240, 305 226" />
      <FlowPath d="M395 226 C 420 240, 435 258, 466 274" />
      <FlowPath d="M474 274 C 500 260, 490 220, 483 196" />

      {/* Agent */}
      <g filter="url(#qerin-hero-shadow)">
        <rect x="74" y="266" width="52" height="34" fill={PED_BODY} />
        <ellipse cx="100" cy="266" rx="26" ry="8" fill={PED_TOP} />
        <ellipse cx="100" cy="300" rx="26" ry="8" fill={PED_BOTTOM} />
      </g>
      <rect x="94" y="250" width="12" height="16" fill={PED_BODY} />
      <g filter="url(#qerin-hero-shadow)">
        <rect x="76" y="202" width="48" height="48" rx="14" fill="var(--qerin-surface)" stroke="var(--qerin-border)" />
      </g>
      <g stroke="var(--qerin-accent)" strokeWidth="1.6" fill="none" strokeLinecap="round">
        <rect x="88" y="216" width="24" height="18" rx="6" />
        <circle cx="95" cy="225" r="1.8" fill="var(--qerin-accent)" stroke="none" />
        <circle cx="105" cy="225" r="1.8" fill="var(--qerin-accent)" stroke="none" />
        <path d="M100 216v-6M94 210h12" />
      </g>
      <text x="100" y="326" textAnchor="middle" fontFamily="var(--font-ibm-plex-mono), monospace" fontWeight="600" fontSize="10.5" letterSpacing="0.08em" fill="var(--qerin-text-muted)">
        AI AGENT
      </text>

      {/* USDC coin */}
      <g filter="url(#qerin-hero-shadow)">
        <rect x="208" y="280" width="44" height="20" fill={PED_BODY} />
        <ellipse cx="230" cy="280" rx="22" ry="7" fill="url(#qerin-coin-grad)" />
        <ellipse cx="230" cy="300" rx="22" ry="7" fill={PED_BOTTOM} />
      </g>
      <text x="230" y="284" textAnchor="middle" fontFamily="var(--font-ibm-plex-mono), monospace" fontWeight="700" fontSize="12" fill="#3A3A3A">
        $
      </text>

      {/* Qerin block */}
      <g filter="url(#qerin-hero-shadow)">
        <rect x="305" y="150" width="90" height="150" rx="22" fill="url(#qerin-cube-grad)" />
      </g>
      <image href="/qerin-mark-white.png" x="325" y="185" width="50" height="50" />
      <text x="350" y="326" textAnchor="middle" fontFamily="var(--font-ibm-plex-mono), monospace" fontWeight="600" fontSize="10.5" letterSpacing="0.08em" fill="var(--qerin-text-muted)">
        QERIN
      </text>

      {/* Base coin */}
      <g filter="url(#qerin-hero-shadow)">
        <rect x="448" y="280" width="44" height="20" fill={PED_BODY} />
        <ellipse cx="470" cy="280" rx="22" ry="7" fill="url(#qerin-coin-grad)" />
        <ellipse cx="470" cy="300" rx="22" ry="7" fill={PED_BOTTOM} />
      </g>
      <path d="M470 274a6.2 6.2 0 0 1 0 12.4Z" fill="#3A3A3A" />

      {/* Receipt card — floats, no pedestal */}
      <g transform="rotate(-3 545 128)">
        <g filter="url(#qerin-hero-shadow)">
          <path
            d="M485 40 h114 a6 6 0 0 1 6 6 v128 l-9 8.5 -9 -8.5 -9 8.5 -9 -8.5 -9 8.5 -9 -8.5 -9 8.5 -9 -8.5 -9 8.5 -9 -8.5 -9 8.5 v-136 a6 6 0 0 1 6 -6 Z"
            fill="var(--qerin-surface)"
            stroke="var(--qerin-border)"
          />
        </g>
        <circle cx="581" cy="60" r="8" fill="#1b7a4a" />
        <path d="M577.5 60l2.3 2.3L586.5 57" stroke="#ffffff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <text x="500" y="63" fontFamily="var(--font-ibm-plex-mono), monospace" fontWeight="600" fontSize="9.5" letterSpacing="0.05em" fill="var(--qerin-accent)">
          RECEIPT
        </text>
        <rect x="500" y="80" width="66" height="6" rx="3" fill="var(--qerin-border)" />
        <rect x="500" y="97" width="48" height="6" rx="3" fill="var(--qerin-border)" />
        <rect x="500" y="114" width="58" height="6" rx="3" fill="var(--qerin-border)" />
        <rect x="500" y="140" width="90" height="1" fill="var(--qerin-border)" />
        <text x="500" y="158" fontFamily="var(--font-ibm-plex-mono), monospace" fontSize="9" fill="var(--qerin-text-muted)">
          0x3f9a…b271
        </text>
      </g>
      <text x="542" y="228" textAnchor="middle" fontFamily="var(--font-ibm-plex-mono), monospace" fontWeight="600" fontSize="10.5" letterSpacing="0.06em" fill="var(--qerin-text-muted)">
        ON-CHAIN RECEIPT
      </text>
    </svg>
  );
}
