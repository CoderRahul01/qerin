import { HTTPFacilitatorClient } from "@x402/core/server";
import { getCdpAuthHeaders, getCdpCredentials } from "./cdpAuth.js";

// See cdpAuth.ts for why this hand-rolls CDP JWT auth instead of using
// @coinbase/cdp-sdk's createCdpFacilitatorClient directly.

const CDP_FACILITATOR_URL = "https://api.cdp.coinbase.com/platform/v2/x402";

/**
 * CDP-authenticated x402 facilitator client for Base mainnet. Credentials
 * come from CDP_API_KEY_ID / CDP_API_KEY_SECRET (read lazily — see wallet.ts
 * for why process.env can't be read at module scope on Workers).
 */
export function createQerinCdpFacilitatorClient(): HTTPFacilitatorClient {
  const credentials = getCdpCredentials();
  const parsed = new URL(CDP_FACILITATOR_URL);
  const basePath = parsed.pathname.replace(/\/$/, "");
  const host = parsed.host;
  const paths = {
    verify: `${basePath}/verify`,
    settle: `${basePath}/settle`,
    supported: `${basePath}/supported`,
  };

  return new HTTPFacilitatorClient({
    url: CDP_FACILITATOR_URL,
    createAuthHeaders: async () => {
      const [verify, settle, supported] = await Promise.all([
        getCdpAuthHeaders(credentials, host, paths.verify),
        getCdpAuthHeaders(credentials, host, paths.settle),
        getCdpAuthHeaders(credentials, host, paths.supported, "GET"),
      ]);
      return { verify, settle, supported };
    },
  });
}
