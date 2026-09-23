import posthog from "posthog-js";

// Thin wrapper so call sites never break when PostHog is not configured.
// Never pass question text, balances tied to identity, or signatures here.
export type TrackedEvent =
  | "wallet_connected"
  | "free_pass_claimed"
  | "topup_confirmed"
  | "query_submitted"
  | "query_completed"
  | "query_failed"
  | "insufficient_balance";

function enabled(): boolean {
  return typeof window !== "undefined" && Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY) && posthog.__loaded;
}

export function track(event: TrackedEvent, properties?: Record<string, string | number | boolean | null>) {
  if (!enabled()) return;
  try {
    posthog.capture(event, properties);
  } catch {}
}

// Wallet addresses are already public on-chain; using one as the PostHog
// distinct id links a user's sessions across devices for funnels/retention.
export function identifyWallet(address: string) {
  if (!enabled()) return;
  try {
    posthog.identify(address.toLowerCase());
  } catch {}
}
