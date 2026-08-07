import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

// Lazily constructed for the same reason as wallet.ts's getQerinAccount() —
// process.env isn't populated at module-import time on Workers.
let sqlClient: NeonQueryFunction<false, false> | null = null;

export function getSql(): NeonQueryFunction<false, false> {
  if (!sqlClient) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error(
        "DATABASE_URL is not set — required for API key metering and the daily spend cap."
      );
    }
    sqlClient = neon(databaseUrl);
  }
  return sqlClient;
}
