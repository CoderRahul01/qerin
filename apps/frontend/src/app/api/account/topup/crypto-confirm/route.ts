import { getClientIp } from "@/lib/clientIp";
import { fetchBackend, getInternalSecret } from "@/lib/backendClient";

export async function POST(req: Request) {
  const internalSecret = getInternalSecret();

  const accountId = req.headers.get("x-qerin-account-id");
  if (!accountId) {
    return Response.json({ error: "X-Qerin-Account-Id header is required" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));

  try {
    const res = await fetchBackend("/v1/account/topup/crypto-confirm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Qerin-Internal-Secret": internalSecret,
        "X-Qerin-Account-Id": accountId,
        "X-Qerin-Client-Ip": getClientIp(req),
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "Unable to confirm deposit on backend: " + message }, { status: 502 });
  }
}
