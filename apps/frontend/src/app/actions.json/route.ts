import { ACTIONS_CORS_HEADERS } from "@solana/actions";

export async function GET() {
  const payload = {
    rules: [
      {
        pathPattern: "/api/actions/**",
        apiPath: "/api/actions/**",
      },
      {
        pathPattern: "/research/**",
        apiPath: "/api/actions/research/**",
      },
    ],
  };

  return Response.json(payload, {
    headers: ACTIONS_CORS_HEADERS,
  });
}

export const OPTIONS = GET;
