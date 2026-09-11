import type { Metadata, Viewport } from "next";
import { Inter, IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

// Homepage-only display face for hero/H1 headlines, per brand guidelines —
// Inter stays the default everywhere else, including /app.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  weight: ["500", "700"],
  subsets: ["latin"],
});

// Inline, blocking (runs before first paint) — reads the saved theme choice
// and stamps it on <html> immediately so there's no flash of the wrong
// theme. Default is always light; dark is opt-in only, never inferred from
// the OS/browser's prefers-color-scheme. Always sets the attribute (never
// leaves it absent) so third-party CSS that falls back to
// prefers-color-scheme when data-theme is unset (e.g. react-tweet) can't
// disagree with our own light/dark state.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("qerin-theme");document.documentElement.setAttribute("data-theme",t==="dark"?"dark":"light");}catch(e){}})();`;

export const metadata: Metadata = {
  title: "Qerin",
  description: "Verified answers, paid in stablecoins.",
  // Base Build's "Verify with meta tag" step (App Router variant): the
  // dashboard's own snippet targets pages/index.tsx (Pages Router), which
  // this project doesn't use — `other` renders the equivalent <meta> tag
  // into this root layout's <head> instead. Set BASE_APP_ID once the domain
  // is registered in the Base Build dashboard.
  other: process.env.BASE_APP_ID ? { "base:app_id": process.env.BASE_APP_ID } : undefined,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="light"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${inter.variable} ${ibmPlexMono.variable} ${spaceGrotesk.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
