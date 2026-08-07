const CHECKOUT_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: { ondismiss?: () => void };
  theme?: { color?: string };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CHECKOUT_SCRIPT_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Razorpay Checkout"));
    document.body.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Opens Razorpay's embedded Checkout modal and resolves with the
 * payment details once the user completes payment, or rejects if they
 * dismiss the modal or the checkout fails to load.
 */
export async function openRazorpayCheckout(options: {
  keyId: string;
  amountPaise: number;
  orderId: string;
}): Promise<RazorpaySuccessResponse> {
  await loadRazorpayScript();
  if (!window.Razorpay) {
    throw new Error("Razorpay Checkout failed to load");
  }

  return new Promise((resolve, reject) => {
    const razorpay = new window.Razorpay!({
      key: options.keyId,
      amount: options.amountPaise,
      currency: "INR",
      order_id: options.orderId,
      name: "Qerin",
      description: "Balance top-up",
      handler: (response) => resolve(response),
      modal: { ondismiss: () => reject(new Error("dismissed")) },
      theme: { color: "#0000FF" },
    });
    razorpay.open();
  });
}
