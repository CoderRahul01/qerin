export async function POST() {
  return Response.json({ error: "API keys are not available. Use the x402 paid endpoint or Qerin web app." }, { status: 410 });
}
