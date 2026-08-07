import type { Metadata, Viewport } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Qerin",
  description: "Ask anything. Qerin pays for the truth.",
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
    <html lang="en" className={`${inter.variable} ${ibmPlexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
