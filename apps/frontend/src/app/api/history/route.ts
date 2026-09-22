import { getClientIp } from "@/lib/clientIp";
import { fetchBackend, getInternalSecret } from "@/lib/backendClient";

function historyHeaders(req: Request): HeadersInit | null {
  const vaultId = req.headers.get("x-qerin-chat-vault-id");
  if (!vaultId) return null;
  return {
    "X-Qerin-Internal-Secret": getInternalSecret(),
    "X-Qerin-Chat-Vault-Id": vaultId,
    "X-Qerin-Client-Ip": getClientIp(req),
  };
}

export async function GET(req: Request) {
  const headers = historyHeaders(req);
  if (!headers) return Response.json({ error: "X-Qerin-Chat-Vault-Id header is required" }, { status: 400 });

  try {
    const res = await fetchBackend("/v1/history", { headers });
    return Response.json(await res.json(), { status: res.status });
  } catch {
    return Response.json({ error: "Chat history is temporarily unavailable" }, { status: 503 });
  }
}

export async function PUT(req: Request) {
  const headers = historyHeaders(req);
  if (!headers) return Response.json({ error: "X-Qerin-Chat-Vault-Id header is required" }, { status: 400 });

  try {
    const body = await req.json();
    const res = await fetchBackend("/v1/history", {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return Response.json(await res.json(), { status: res.status });
  } catch {
    return Response.json({ error: "Chat history could not be saved" }, { status: 503 });
  }
}
