import { fetchBackend, getInternalSecret } from "@/lib/backendClient";

export async function GET(req: Request) {
  const accountId = req.headers.get("x-qerin-account-id");
  if (!accountId) {
    return Response.json({ error: "X-Qerin-Account-Id header is required" }, { status: 400 });
  }

  const internalSecret = getInternalSecret();

  try {
    const res = await fetchBackend("/v1/account/balance", {
      headers: {
        "X-Qerin-Internal-Secret": internalSecret,
        "X-Qerin-Account-Id": accountId,
      },
    });

    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch {
    // Graceful fallback for offline dev or temporary connectivity drops
    return Response.json({ balance: 0, passClaimed: false, offline: true }, { status: 200 });
  }
}
