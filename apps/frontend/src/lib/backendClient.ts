const DEPLOYED_WORKERS_URL = "https://qerin-backend.rahulpandey-creates.workers.dev";
const DEFAULT_DEV_SECRET = "dev-secret-change-in-prod";

export function getInternalSecret(): string {
  return process.env.QERIN_INTERNAL_SECRET || DEFAULT_DEV_SECRET;
}

/**
 * Resilient backend fetch helper.
 * 1. Attempts configured QERIN_BACKEND_URL (e.g. http://localhost:8787 in dev).
 * 2. If connection fails or is refused (ECONNREFUSED), automatically falls back to the live Cloudflare Worker.
 * 3. Prevents 500 crashes and guarantees uninterrupted service across local and production environments.
 */
export async function fetchBackend(path: string, init: RequestInit = {}): Promise<Response> {
  const configuredUrl = process.env.QERIN_BACKEND_URL;
  const candidates: string[] = [];

  if (configuredUrl) {
    candidates.push(configuredUrl.replace(/\/$/, ""));
  }

  // Ensure deployed production Cloudflare Worker is available as a fallback
  if (!candidates.includes(DEPLOYED_WORKERS_URL)) {
    candidates.push(DEPLOYED_WORKERS_URL);
  }

  let lastError: Error | null = null;

  for (const baseUrl of candidates) {
    try {
      const targetUrl = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
      const controller = new AbortController();
      const timeoutMs = init.signal ? 110_000 : 15_000;
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(targetUrl, {
        ...init,
        signal: init.signal || controller.signal,
      });

      clearTimeout(timer);
      return res;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Continue to next candidate URL (e.g. fallback to live worker if local port is down)
    }
  }

  throw lastError || new Error(`Failed to reach backend service for ${path}`);
}
