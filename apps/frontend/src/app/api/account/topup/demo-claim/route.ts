import { getClientIp } from "@/lib/clientIp";

// Deployed managed siteverify Worker (cloudflare/skills turnstile-spin
// template) — validates the Turnstile token before this free-credit claim
// is allowed through. Public endpoint, not a secret; the actual Turnstile
// secret key lives only in the Worker's own Cloudflare secret store.
const TURNSTILE_WORKER_URL = "https://turnstile-siteverify-qerin.rahulpandey-creates.workers.dev/";

export async function POST(req: Request) {
  const backendUrl = process.env.QERIN_BACKEND_URL;
  if (!backendUrl) {
    return Response.json({ error: "QERIN_BACKEND_URL is not configured" }, { status: 500 });
  }

  const internalSecret = process.env.QERIN_INTERNAL_SECRET;
  if (!internalSecret) {
    return Response.json({ error: "QERIN_INTERNAL_SECRET is not configured" }, { status: 500 });
  }

  const accountId = req.headers.get("x-qerin-account-id");
  if (!accountId) {
    return Response.json({ error: "X-Qerin-Account-Id header is required" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const turnstileToken = typeof body?.turnstileToken === "string" ? body.turnstileToken : "";
  if (!turnstileToken) {
    return Response.json({ error: "Complete the verification challenge to claim the pass." }, { status: 400 });
  }

  // Gate server-side, not just in the UI — this route is public and callable
  // directly, so a client-side-only widget wouldn't stop a scripted claim.
  try {
    const verifyRes = await fetch(TURNSTILE_WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: turnstileToken }),
    });
    const verifyData = await verifyRes.json().catch(() => ({ success: false }));
    if (!verifyData?.success) {
      return Response.json({ error: "Verification failed. Please try again." }, { status: 400 });
    }
  } catch {
    return Response.json({ error: "Could not verify challenge — try again shortly." }, { status: 502 });
  }

  try {
    const res = await fetch(`${backendUrl}/v1/account/topup/demo-claim`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Qerin-Internal-Secret": internalSecret,
        "X-Qerin-Account-Id": accountId,
        "X-Qerin-Client-Ip": getClientIp(req),
      },
    });

    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch {
    return Response.json({ error: "Could not reach backend service" }, { status: 502 });
  }
}
