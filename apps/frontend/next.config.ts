import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/waitlist",
        destination: "/app",
        permanent: false,
      },
    ];
  },
  // Deliberately no X-Frame-Options / frame-ancestors lockdown: Qerin is a
  // registered Base Mini App (see the farcaster.json manifest route), which
  // means Coinbase Wallet / Base App legitimately load this site in an
  // iframe/webview. Blocking framing here would silently break that
  // distribution channel. Everything below is safe alongside that.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Stops the browser from guessing content types away from what
          // the server declared — closes a class of MIME-sniffing XSS.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Full URLs (which can carry a question or account context in a
          // query string) never leak to a third-party site via the
          // Referer header on an outbound link; same-origin navigation is
          // unaffected.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // This app never needs camera/mic/geolocation/payment-sheet
          // access — deny them so an embedding surface (or a future
          // dependency) can't silently request them.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
