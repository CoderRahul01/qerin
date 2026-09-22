import { fetchBackend, getInternalSecret } from "@/lib/backendClient";

export const revalidate = 300;

export async function GET() {
  try {
    const response = await fetchBackend("/v1/analytics", {
      headers: { "X-Qerin-Internal-Secret": getInternalSecret() },
      next: { revalidate: 300 },
    });
    const body = await response.json();
    return Response.json(body, {
      status: response.status,
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch {
    return Response.json(
      { error: "Analytics are temporarily unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
