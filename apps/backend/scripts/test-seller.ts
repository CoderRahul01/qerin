// A minimal x402-protected resource, running locally, used only to prove
// Qerin's buyer-side payment code (wallet.ts, paidFetch.ts) fires a real,
// settled Base Sepolia transaction. Not part of the shipped product — Qerin
// is a buyer only; this stands in for a real source until real source URLs
// are wired in (see 03-payment-layer.md, 07-deployment.md facilitator table).
import "dotenv/config";
import express from "express";
import { x402ResourceServer, HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { paymentMiddleware } from "@x402/express";

const BASE_SEPOLIA = "eip155:84532" as const;
const PAY_TO = process.env.TEST_SELLER_PAYTO;

if (!PAY_TO) {
  throw new Error("Set TEST_SELLER_PAYTO to an address that should receive the test payment.");
}

const facilitator = new HTTPFacilitatorClient({ url: "https://x402.org/facilitator" });
const server = new x402ResourceServer(facilitator).register(BASE_SEPOLIA, new ExactEvmScheme());

const app = express();

app.use(
  paymentMiddleware(
    {
      "GET /paid-resource": {
        accepts: {
          scheme: "exact",
          payTo: PAY_TO,
          price: "$0.01",
          network: BASE_SEPOLIA,
        },
        description: "Qerin payment-proof test resource",
      },
    },
    server
  )
);

app.get("/paid-resource", (_req, res) => {
  res.json({ headline: "Test source content", published: new Date().toISOString() });
});

const port = process.env.TEST_SELLER_PORT ? Number(process.env.TEST_SELLER_PORT) : 4021;
app.listen(port, () => console.log(`Test x402 seller listening on :${port}`));
