export async function GET(req: Request) {
  const backendUrl = process.env.QERIN_BACKEND_URL;
  if (!backendUrl) {
    return Response.json({ error: "QERIN_BACKEND_URL is not configured" }, { status: 500 });
  }

  const { search } = new URL(req.url);
  const res = await fetch(`${backendUrl}/v1/network-info${search}`);
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
