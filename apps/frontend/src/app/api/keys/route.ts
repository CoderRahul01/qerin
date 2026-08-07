export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const backendUrl = process.env.QERIN_BACKEND_URL;
  if (!backendUrl) {
    return Response.json({ error: "QERIN_BACKEND_URL is not configured" }, { status: 500 });
  }

  const res = await fetch(`${backendUrl}/v1/keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return Response.json(data, { status: res.status });
}
