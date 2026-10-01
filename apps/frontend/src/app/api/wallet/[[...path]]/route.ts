import { fetchBackend, getInternalSecret } from "@/lib/backendClient";

// Thin proxy to the backend's Qerin Wallet API (apps/backend/src/walletRoutes.ts).
// Only these exact paths are forwarded, so this route can never be used to
// reach any other internal-secret-gated backend endpoint.
const POST_PATHS = new Set(["provision", "policy/prepare", "policy/confirm", "withdraw/prepare", "withdraw/confirm"]);

function forwardHeaders(req: Request): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Qerin-Internal-Secret": getInternalSecret(),
  };
  const account = req.headers.get("x-qerin-account-id");
  const proof = req.headers.get("x-qerin-account-proof");
  if (account) headers["X-Qerin-Account-Id"] = account;
  if (proof) headers["X-Qerin-Account-Proof"] = proof;
  return headers;
}

async function relay(res: Response): Promise<Response> {
  const data = await res.json().catch(() => null);
  if (data === null) return Response.json({ error: "Qerin's backend returned an unreadable response. Try again." }, { status: 502 });
  return Response.json(data, { status: res.status });
}

export async function GET(req: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  if (path && path.length > 0) return Response.json({ error: "Not found" }, { status: 404 });
  const fresh = new URL(req.url).searchParams.get("fresh") === "1" ? "?fresh=1" : "";
  try {
    return await relay(await fetchBackend(`/v1/wallet${fresh}`, { headers: forwardHeaders(req) }));
  } catch {
    return Response.json({ error: "Your Qerin wallet is temporarily unavailable" }, { status: 503 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  const sub = (path ?? []).join("/");
  if (!POST_PATHS.has(sub)) return Response.json({ error: "Not found" }, { status: 404 });
  const body = await req.text();
  try {
    return await relay(await fetchBackend(`/v1/wallet/${sub}`, {
      method: "POST",
      headers: forwardHeaders(req),
      body: body || "{}",
      signal: AbortSignal.timeout(60_000),
    }));
  } catch {
    return Response.json({ error: "Could not reach Qerin's backend. Try again shortly." }, { status: 504 });
  }
}
