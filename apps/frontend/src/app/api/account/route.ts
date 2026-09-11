import { getClientIp } from "@/lib/clientIp";
import { fetchBackend, getInternalSecret } from "@/lib/backendClient";

interface AccountBody {
  walletAddress?: string;
}

export async function POST(req: Request) {
  const internalSecret = getInternalSecret();

  let body: AccountBody = {};
  try {
    body = (await req.json()) as AccountBody;
  } catch {}

  try {
    const res = await fetchBackend("/v1/account", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Qerin-Internal-Secret": internalSecret,
        "X-Qerin-Client-Ip": getClientIp(req),
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch {
    // Fallback: Return client-compatible account object if backend is offline
    const walletAddress = body.walletAddress;
    return Response.json(
      {
        accountId: walletAddress || crypto.randomUUID(),
        balance: 0,
        offline: true,
      },
      { status: 200 }
    );
  }
}
