export async function POST(req: Request) {
  const body = await req.json();

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

  // The consumer path (/v1/answer on the backend) only accepts calls that
  // carry this shared secret AND a funded account balance — nothing
  // public-facing can hit it for free. Developers instead call
  // /v1/paid/answer directly with an x402 payment attached; see
  // DeveloperScreen.tsx.
  const res = await fetch(`${backendUrl}/v1/answer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Qerin-Internal-Secret": internalSecret,
      "X-Qerin-Account-Id": accountId,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return Response.json(data, { status: res.status });
}
