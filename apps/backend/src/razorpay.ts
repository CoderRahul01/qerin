import { recordDeposit } from "./accounts.js";

// Consumer top-up funding, replacing the rejected Coinbase Onramp
// integration — Razorpay handles fiat (UPI/cards/netbanking) directly,
// no wallet or crypto exposure for the end user. Qerin's operational
// wallet is funded separately by the business from collected revenue;
// see 03-payment-layer.md.

const RAZORPAY_API = "https://api.razorpay.com/v1";

// Fixed conversion rate — no live FX lookup needed at this volume.
// Update this constant as INR/USD drifts meaningfully.
const INR_PER_USD = 88;

interface RazorpayCredentials {
  keyId: string;
  keySecret: string;
}

function getRazorpayCredentials(): RazorpayCredentials {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  const missing: string[] = [];
  if (!keyId) missing.push("RAZORPAY_KEY_ID");
  if (!keySecret) missing.push("RAZORPAY_KEY_SECRET");
  if (missing.length > 0) {
    throw new Error(`Missing required Razorpay credentials: ${missing.join(", ")}`);
  }

  return { keyId: keyId!, keySecret: keySecret! };
}

function basicAuthHeader(credentials: RazorpayCredentials): string {
  const token = btoa(`${credentials.keyId}:${credentials.keySecret}`);
  return `Basic ${token}`;
}

export interface TopupOrder {
  orderId: string;
  amountPaise: number;
  keyId: string;
  amountUsd: number;
}

export async function createTopupOrder(accountId: string, amountUsd: number): Promise<TopupOrder> {
  const credentials = getRazorpayCredentials();
  const amountPaise = Math.round(amountUsd * INR_PER_USD * 100);

  const res = await fetch(`${RAZORPAY_API}/orders`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(credentials),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: "INR",
      receipt: accountId,
    }),
  });

  if (!res.ok) {
    throw new Error(`Razorpay order creation failed (${res.status}): ${await res.text()}`);
  }

  const body = (await res.json()) as { id?: string };
  if (!body.id) {
    throw new Error("Razorpay order response did not include an id");
  }

  return { orderId: body.id, amountPaise, keyId: credentials.keyId, amountUsd };
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export interface ConfirmResult {
  verified: boolean;
  balance: number;
}

export async function verifyAndCreditPayment(
  accountId: string,
  orderId: string,
  paymentId: string,
  signature: string,
  amountUsd: number
): Promise<ConfirmResult> {
  const credentials = getRazorpayCredentials();

  const expectedSignature = await hmacSha256Hex(credentials.keySecret, `${orderId}|${paymentId}`);
  if (!timingSafeEqual(expectedSignature, signature)) {
    return { verified: false, balance: 0 };
  }

  const { balance } = await recordDeposit(accountId, paymentId, amountUsd);
  return { verified: true, balance };
}
