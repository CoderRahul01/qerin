import posthog from "posthog-js";

// Product analytics (PostHog free tier). Disabled unless a project key is
// configured, so local dev and forks send nothing. Requests go through the
// /ingest rewrite in next.config.ts so ad blockers do not drop them.
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (key) {
  posthog.init(key, {
    api_host: "/ingest",
    ui_host: process.env.NEXT_PUBLIC_POSTHOG_REGION === "eu" ? "https://eu.posthog.com" : "https://us.posthog.com",
    defaults: "2025-05-24",
    person_profiles: "identified_only",
    // Research questions can be sensitive: never record typed input.
    session_recording: { maskAllInputs: true },
  });
}
