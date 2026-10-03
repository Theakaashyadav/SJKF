import { createHmac, timingSafeEqual } from "node:crypto";

function credentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay is not configured");
  return { keyId, keySecret };
}

async function razorpayFetch<T>(path: string, init?: RequestInit) {
  const { keyId, keySecret } = credentials();
  const authorization = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: { Authorization: `Basic ${authorization}`, "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Razorpay request failed (${response.status})`);
  return payload as T;
}

export type RazorpayOrder = { id: string; amount: number; amount_paid: number; currency: string; receipt: string; status: string; notes?: Record<string, string> };
export type RazorpayPayment = { id: string; order_id: string; amount: number; currency: string; status: string; captured: boolean; email?: string; contact?: string; created_at: number };

export async function createRazorpayOrder(data: { amountPaise: number; receipt: string; notes: Record<string, string> }) {
  return razorpayFetch<RazorpayOrder>("/orders", { method: "POST", body: JSON.stringify({ amount: data.amountPaise, currency: "INR", receipt: data.receipt, notes: data.notes }) });
}

export async function getRazorpayOrder(id: string) {
  return razorpayFetch<RazorpayOrder>(`/orders/${encodeURIComponent(id)}`);
}

export async function getRazorpayPayment(id: string) {
  return razorpayFetch<RazorpayPayment>(`/payments/${encodeURIComponent(id)}`);
}

export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
  const { keySecret } = credentials();
  const expected = createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function verifyWebhookSignature(body: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error("Webhook secret is not configured");
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
