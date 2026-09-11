import { getClientIp } from "@/lib/clientIp";

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

  const res = await fetch(`${backendUrl}/v1/account/topup/crypto-confirm`, {
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
}
