import { fetchBackend, getInternalSecret } from "@/lib/backendClient";

export const maxDuration = 120;

export async function POST(req: Request) {
  const body = await req.json();

  const internalSecret = getInternalSecret();

  const accountId = req.headers.get("x-qerin-account-id");
  if (!accountId) {
    return Response.json({ error: "X-Qerin-Account-Id header is required" }, { status: 400 });
  }

  try {
    const res = await fetchBackend("/v1/answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Qerin-Internal-Secret": internalSecret,
        "X-Qerin-Account-Id": accountId,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(110_000),
    });

    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("text/event-stream") && res.body) {
      return new Response(res.body, {
        status: res.status,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const data = await res.json().catch(() => null);
    if (data === null) {
      return Response.json({ error: "Qerin's backend returned an unreadable response. Try again." }, { status: 502 });
    }
    return Response.json(data, { status: res.status });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return Response.json(
      {
        error: timedOut
          ? "Qerin's backend took too long to respond. No charge was made — try again."
          : "Could not reach Qerin's backend. Try again shortly.",
      },
      { status: 504 }
    );
  }
}
