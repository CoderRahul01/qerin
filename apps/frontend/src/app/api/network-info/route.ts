import { fetchBackend } from "@/lib/backendClient";

export async function GET(req: Request) {
  const { search } = new URL(req.url);

  try {
    const res = await fetchBackend(`/v1/network-info${search}`);
    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch {
    return Response.json({ error: "Network and payment status are temporarily unavailable" }, { status: 503 });
  }
}
