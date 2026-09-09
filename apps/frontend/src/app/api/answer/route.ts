export async function POST(req: Request) {
  const body = await req.json();

  const backendUrl = process.env.QERIN_BACKEND_URL;
  if (!backendUrl) {
    return Response.json({ error: "QERIN_BACKEND_URL is not configured" }, { status: 500 });
  }

  const internalSecret = process.env.QERIN_INTERNAL_SECRET;
  if (!internalSecret) {
    return Response.json({ error: "QERIN_INTERNAL_SECRET is not configured" }, { status: 500 });
  }

  const accountId = req.headers.get("x-qerin-account-id");
  if (!accountId) {
    return Response.json({ error: "X-Qerin-Account-Id header is required" }, { status: 400 });
  }

  // The consumer path (/v1/answer on the backend) only accepts calls that
  // carry this shared secret AND a funded account balance — nothing
  // public-facing can hit it for free. Developers instead call
  // /v1/paid/answer directly with an x402 payment attached; see
  // DeveloperScreen.tsx.
  //
  // This used to have no try/catch and no timeout at all: if the backend
  // hung (a stuck paid source with no timeout of its own) or the network
  // call itself failed, this route threw an unhandled exception and Next.js
  // turned it into a bare 500 with no JSON body — which the frontend's own
  // `res.json()` call then failed to parse, so the "Paying..." screen never
  // resolved to either a result or a visible error. A 30s cap here, plus
  // explicit error handling, guarantees the client always gets back JSON.
  try {
    const res = await fetch(`${backendUrl}/v1/answer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Qerin-Internal-Secret": internalSecret,
        "X-Qerin-Account-Id": accountId,
      },
      body: JSON.stringify(body),
      // Generous on purpose: the backend's own worst case is a full LLM
      // fallback cascade (up to 4 providers, ~20s each if every one stalls)
      // plus source gathering — genuinely rare, but this should only fire
      // for an actual multi-provider outage, not ordinary slow-but-working
      // latency.
      signal: AbortSignal.timeout(45_000),
    });

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
