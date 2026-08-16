export async function GET() {
  const backendUrl = process.env.QERIN_BACKEND_URL;
  if (!backendUrl) {
    return Response.json({ error: "QERIN_BACKEND_URL is not configured" }, { status: 500 });
  }

  const res = await fetch(`${backendUrl}/v1/network-info`);
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
