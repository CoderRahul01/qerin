import { getClientIp } from "@/lib/clientIp";
import { fetchBackend, getInternalSecret } from "@/lib/backendClient";

const TURNSTILE_WORKER_URL = "https://turnstile-siteverify-qerin.rahulpandey-creates.workers.dev/";

export async function POST(req: Request) {
  const internalSecret = getInternalSecret();

  const accountId = req.headers.get("x-qerin-account-id");
  if (!accountId) {
    return Response.json({ error: "X-Qerin-Account-Id header is required" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const turnstileToken = typeof body?.turnstileToken === "string" ? body.turnstileToken : "";
  if (!turnstileToken) {
    return Response.json({ error: "Complete the verification challenge to claim the pass." }, { status: 400 });
  }

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
    const res = await fetchBackend("/v1/account/topup/demo-claim", {
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
