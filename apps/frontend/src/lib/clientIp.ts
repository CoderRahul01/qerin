// Vercel puts the real visitor IP in x-forwarded-for (leftmost entry) /
// x-real-ip on every request that reaches a Next.js API route. Without
// forwarding it on, the Cloudflare Worker backend only ever sees Vercel's
// own egress IP on every request — its per-IP rate limiter effectively
// buckets ALL users together instead of limiting any individual one.
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
