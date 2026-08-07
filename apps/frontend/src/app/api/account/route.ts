export async function POST() {
  const backendUrl = process.env.QERIN_BACKEND_URL;
  if (!backendUrl) {
    return Response.json({ error: "QERIN_BACKEND_URL is not configured" }, { status: 500 });
  }

  const internalSecret = process.env.QERIN_INTERNAL_SECRET;
  if (!internalSecret) {
    return Response.json({ error: "QERIN_INTERNAL_SECRET is not configured" }, { status: 500 });
  }

  const res = await fetch(`${backendUrl}/v1/account`, {
    method: "POST",
    headers: { "X-Qerin-Internal-Secret": internalSecret },
  });

  const data = await res.json();
  return Response.json(data, { status: res.status });
}
