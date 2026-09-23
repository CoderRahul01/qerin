import { timingSafeEqual } from "node:crypto";
import { fetchBackend, getInternalSecret } from "@/lib/backendClient";

export const dynamic = "force-dynamic";

function isAdmin(request: Request): boolean {
  const expected = process.env.QERIN_ADMIN_KEY;
  const provided = request.headers.get("x-qerin-admin-key");
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Private founder analytics. Requires QERIN_ADMIN_KEY (set only in the
// deployment environment) on top of the internal secret the backend checks.
export async function GET(request: Request) {
  if (!process.env.QERIN_ADMIN_KEY) {
    return Response.json({ error: "QERIN_ADMIN_KEY is not configured on this deployment" }, { status: 503 });
  }
  if (!isAdmin(request)) {
    return Response.json({ error: "Invalid admin key" }, { status: 401 });
  }

  const days = new URL(request.url).searchParams.get("days") ?? "30";
  try {
    const response = await fetchBackend(`/v1/admin/analytics?days=${encodeURIComponent(days)}`, {
      headers: { "X-Qerin-Internal-Secret": getInternalSecret() },
      cache: "no-store",
    });
    const body = await response.json();
    return Response.json(body, { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Admin analytics are temporarily unavailable" }, { status: 503 });
  }
}
