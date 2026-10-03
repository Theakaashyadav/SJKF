import type { RazorpayOrder, RazorpayPayment } from "@/lib/razorpay";
import { createHash } from "node:crypto";

export type PendingDonation = {
  orderId: string;
  receipt: string;
  amountPaise: number;
  currency: "INR";
  donorName: string;
  email: string;
  mobile: string;
  cause: string;
  address?: string;
  message?: string;
  pan?: string;
  status: "created" | "captured";
  createdAt: string;
  paymentId?: string;
  capturedAt?: string;
};

export type CapturedDonation = PendingDonation & {
  status: "captured";
  paymentId: string;
  capturedAt: string;
};

function redisConfiguration() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return { url: url?.replace(/\/$/, ""), token };
}

export function paymentStoreConfigured() {
  const { url, token } = redisConfiguration();
  return Boolean(url && token);
}

function ttlSeconds() {
  const configured = Number(process.env.PAYMENT_RECORD_TTL_SECONDS);
  return Number.isInteger(configured) && configured >= 86400 ? configured : 31536000;
}

async function redisCommand<T>(command: Array<string | number>): Promise<T> {
  const { url, token } = redisConfiguration();
  if (!url || !token) throw new Error("Payment store is not configured");
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null) as { result?: T; error?: string } | null;
  if (!response.ok || !payload || payload.error) throw new Error(payload?.error || `Payment store request failed (${response.status})`);
  return payload.result as T;
}

const orderKey = (id: string) => `sjpkf:donation:order:${id}`;
const paymentKey = (id: string) => `sjpkf:donation:payment:${id}`;
const receiptKey = (id: string) => `sjpkf:donation:receipt:${id}`;
const eventKey = (id: string) => `sjpkf:razorpay:event:${id}`;

export async function savePendingDonation(record: PendingDonation) {
  const result = await redisCommand<string | null>(["SET", orderKey(record.orderId), JSON.stringify(record), "NX", "EX", ttlSeconds()]);
  if (result !== "OK") throw new Error("Donation order already exists");
}

export async function getPendingDonation(orderId: string): Promise<PendingDonation | null> {
  const result = await redisCommand<string | null>(["GET", orderKey(orderId)]);
  if (!result) return null;
  return JSON.parse(result) as PendingDonation;
}

export async function recordCapturedDonation(pending: PendingDonation, order: RazorpayOrder, payment: RazorpayPayment): Promise<CapturedDonation> {
  const captured: CapturedDonation = {
    ...pending,
    status: "captured",
    paymentId: payment.id,
    capturedAt: new Date(payment.created_at * 1000).toISOString(),
  };
  const inserted = await redisCommand<string | null>(["SET", paymentKey(payment.id), JSON.stringify(captured), "NX", "EX", ttlSeconds()]);
  if (inserted !== "OK") {
    const existingRaw = await redisCommand<string | null>(["GET", paymentKey(payment.id)]);
    if (!existingRaw) throw new Error("Captured donation record could not be read");
    const existing = JSON.parse(existingRaw) as CapturedDonation;
    if (existing.orderId !== order.id || existing.amountPaise !== payment.amount) throw new Error("Stored payment record does not match gateway data");
    return existing;
  }
  await redisCommand<string | null>(["SET", orderKey(order.id), JSON.stringify(captured), "XX", "EX", ttlSeconds()]);
  return captured;
}

export async function receiptDeliveryStatus(paymentId: string) {
  return redisCommand<string | null>(["GET", receiptKey(paymentId)]);
}

export async function markReceiptDelivered(paymentId: string) {
  await redisCommand<string | null>(["SET", receiptKey(paymentId), "sent", "EX", ttlSeconds()]);
}

export async function beginWebhookEvent(eventId: string) {
  const result = await redisCommand<string | null>(["SET", eventKey(eventId), "processing", "NX", "EX", 300]);
  if (result === "OK") return "acquired" as const;
  const existing = await redisCommand<string | null>(["GET", eventKey(eventId)]);
  return existing === "done" ? "done" as const : "processing" as const;
}

export async function completeWebhookEvent(eventId: string) {
  await redisCommand<string | null>(["SET", eventKey(eventId), "done", "XX", "EX", Math.min(ttlSeconds(), 7776000)]);
}

export async function releaseWebhookEvent(eventId: string) {
  await redisCommand<number>(["DEL", eventKey(eventId)]);
}

export async function distributedPaymentRateLimit(scope: string, identifier: string, limit: number, windowSeconds: number) {
  const salt = process.env.PAYMENT_RECEIPT_SECRET || "swabhiman-payment-rate-limit";
  const digest = createHash("sha256").update(`${salt}:${identifier}`).digest("hex").slice(0, 32);
  const key = `sjpkf:rate:${scope}:${digest}`;
  const script = "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]); end; return n";
  const count = await redisCommand<number>(["EVAL", script, 1, key, windowSeconds]);
  return { allowed: count <= limit, retryAfter: count <= limit ? 0 : windowSeconds };
}
