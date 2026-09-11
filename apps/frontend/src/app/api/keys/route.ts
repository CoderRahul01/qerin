import { fetchBackend } from "@/lib/backendClient";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  try {
    const res = await fetchBackend("/v1/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "Could not generate API key: " + message }, { status: 502 });
  }
}
