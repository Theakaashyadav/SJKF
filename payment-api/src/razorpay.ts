import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { allowedOrigins } from "./origins.ts";

const causes = new Set(["Animal Welfare", "Education", "Healthcare", "Environmental Initiatives", "Community Welfare", "General Donation"]);
const apiOrigin = "https://api.razorpay.com/v1";
const orderLifetime = 2 * 60 * 60 * 1000;
const maximumBodyBytes = 4096;
const noStoreHeaders = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

type Environment = Record<string, string | undefined>;
export type Dependencies = { env?: Environment; fetch?: typeof fetch; now?: () => number };
type Credentials = { keyId: string; secret: string };
type Claims = { version: 1; orderId: string; amount: number; currency: "INR"; cause: string; expiresAt: number };

class PaymentError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: noStoreHeaders });
}

function fail(error: unknown) {
  if (error instanceof PaymentError) return json({ error: error.code, message: error.message }, error.status);
  return json({ error: "PAYMENT_PROVIDER_UNAVAILABLE", message: "Payment service is temporarily unavailable. Please try again." }, 502);
}

function credentials(env: Environment): Credentials | null {
  const keyId = env.RAZORPAY_KEY_ID?.trim() || "";
  const secret = env.RAZORPAY_KEY_SECRET?.trim() || "";
  if (!/^rzp_(test|live)_[A-Za-z0-9]+$/.test(keyId) || !secret || secret.length > 256 || /\s/.test(secret)) return null;
  return { keyId, secret };
}

function requiredCredentials(env: Environment) {
  const value = credentials(env);
  if (!value) throw new PaymentError(503, "PAYMENT_CONFIGURATION_MISSING", "Online payment is not configured. Please use UPI or bank transfer.");
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasKeys(value: Record<string, unknown>, keys: string[]) {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function invalid() {
  return new PaymentError(400, "INVALID_PAYMENT_REQUEST", "Payment details are invalid. Please return to the donation form.");
}

function verifyOrigin(request: Request, env: Environment) {
  const origin = request.headers.get("origin");
  // The browser website is hosted separately. Only explicitly approved static
  // website origins may create or verify payments, including cross-site fetches.
  if (!origin || !allowedOrigins(env).has(origin)) {
    throw new PaymentError(403, "PAYMENT_ORIGIN_REJECTED", "Open the donation form on the approved website to continue.");
  }
}

async function requestBody(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new PaymentError(415, "JSON_REQUIRED", "Send payment details as JSON.");
  }
  const declaredLength = request.headers.get("content-length");
  if (declaredLength && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > maximumBodyBytes)) {
    throw new PaymentError(413, "PAYMENT_REQUEST_TOO_LARGE", "Payment request is too large.");
  }
  const reader = request.body?.getReader();
  if (!reader) throw invalid();
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximumBodyBytes) {
        await reader.cancel();
        throw new PaymentError(413, "PAYMENT_REQUEST_TOO_LARGE", "Payment request is too large.");
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try {
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!isRecord(body)) throw invalid();
    return body;
  } catch (error) {
    if (error instanceof PaymentError) throw error;
    throw invalid();
  }
}

function digest(secret: string, input: string) {
  return createHmac("sha256", secret).update(input).digest();
}

function equalHex(expected: Buffer, candidate: string) {
  return /^[a-fA-F0-9]{64}$/.test(candidate) && timingSafeEqual(expected, Buffer.from(candidate, "hex"));
}

function signOrder(claims: Claims, secret: string) {
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${payload}.${digest(secret, `sjkf:razorpay:order:v1:${payload}`).toString("hex")}`;
}

function readOrder(token: string, secret: string, now: number): Claims {
  const parts = token.split(".");
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !equalHex(digest(secret, `sjkf:razorpay:order:v1:${parts[0]}`), parts[1])) throw invalid();
  let claims: unknown;
  try { claims = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")); } catch { throw invalid(); }
  if (!isRecord(claims) || !hasKeys(claims, ["version", "orderId", "amount", "currency", "cause", "expiresAt"]) || claims.version !== 1 ||
      typeof claims.orderId !== "string" || !/^order_[A-Za-z0-9]+$/.test(claims.orderId) ||
      typeof claims.amount !== "number" || !Number.isSafeInteger(claims.amount) || claims.amount < 10000 || claims.amount > 50000000 ||
      claims.currency !== "INR" || typeof claims.cause !== "string" || !causes.has(claims.cause) ||
      typeof claims.expiresAt !== "number" || !Number.isSafeInteger(claims.expiresAt)) throw invalid();
  if (claims.expiresAt <= now || claims.expiresAt > now + orderLifetime) {
    throw new PaymentError(400, "PAYMENT_SESSION_EXPIRED", "This checkout session has expired. Please return to the donation form.");
  }
  return claims as Claims;
}

async function provider(path: string, auth: Credentials, fetcher: typeof fetch, body?: unknown) {
  const response = await fetcher(`${apiOrigin}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${auth.keyId}:${auth.secret}`).toString("base64")}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(12000),
  });
  // Provider descriptions can contain account details. They are never returned to a visitor.
  if (!response.ok) throw new Error("Payment provider request failed");
  const value: unknown = await response.json();
  if (!isRecord(value)) throw new Error("Invalid payment provider response");
  return value;
}

export function handleConfigRequest(dependencies: Dependencies = {}) {
  const auth = credentials(dependencies.env ?? process.env);
  return json(auth ? { configured: true, keyId: auth.keyId } : { configured: false });
}

export async function handleOrderRequest(request: Request, dependencies: Dependencies = {}) {
  try {
    const env = dependencies.env ?? process.env;
    verifyOrigin(request, env);
    const body = await requestBody(request);
    if (!hasKeys(body, ["amount", "cause"]) || typeof body.amount !== "number" || !Number.isSafeInteger(body.amount) ||
        body.amount < 100 || body.amount > 500000 || typeof body.cause !== "string" || !causes.has(body.cause)) throw invalid();
    const auth = requiredCredentials(env);
    const amount = body.amount * 100;
    const order = await provider("/orders", auth, dependencies.fetch ?? fetch, {
      amount,
      currency: "INR",
      receipt: `sjkf_${randomUUID().replaceAll("-", "")}`,
      partial_payment: false,
      notes: { cause: body.cause, source: "swabhiman-foundation" },
    });
    if (typeof order.id !== "string" || !/^order_[A-Za-z0-9]+$/.test(order.id) || order.amount !== amount ||
        order.currency !== "INR" || order.status !== "created") throw new Error("Invalid payment provider order");
    const orderToken = signOrder({ version: 1, orderId: order.id, amount, currency: "INR", cause: body.cause, expiresAt: (dependencies.now ?? Date.now)() + orderLifetime }, auth.secret);
    return json({ keyId: auth.keyId, orderId: order.id, amount, currency: "INR", orderToken });
  } catch (error) { return fail(error); }
}

export async function handleVerifyRequest(request: Request, dependencies: Dependencies = {}) {
  try {
    const env = dependencies.env ?? process.env;
    verifyOrigin(request, env);
    const body = await requestBody(request);
    if (!hasKeys(body, ["orderId", "paymentId", "signature", "orderToken"]) ||
        typeof body.orderId !== "string" || !/^order_[A-Za-z0-9]{1,80}$/.test(body.orderId) ||
        typeof body.paymentId !== "string" || !/^pay_[A-Za-z0-9]{1,80}$/.test(body.paymentId) ||
        typeof body.signature !== "string" || body.signature.length !== 64 ||
        typeof body.orderToken !== "string" || body.orderToken.length > 1024) throw invalid();
    const auth = requiredCredentials(env);
    const claims = readOrder(body.orderToken, auth.secret, (dependencies.now ?? Date.now)());
    if (claims.orderId !== body.orderId || !equalHex(digest(auth.secret, `${claims.orderId}|${body.paymentId}`), body.signature)) {
      throw new PaymentError(400, "PAYMENT_VERIFICATION_FAILED", "Payment verification failed. Please contact the foundation with your payment reference.");
    }
    const fetcher = dependencies.fetch ?? fetch;
    const [payment, order] = await Promise.all([
      provider(`/payments/${body.paymentId}`, auth, fetcher),
      provider(`/orders/${claims.orderId}`, auth, fetcher),
    ]);
    if (payment.id !== body.paymentId || payment.order_id !== claims.orderId || payment.amount !== claims.amount || payment.currency !== "INR" ||
        order.id !== claims.orderId || order.amount !== claims.amount || order.currency !== "INR") {
      throw new PaymentError(400, "PAYMENT_VERIFICATION_FAILED", "Payment details do not match the donation order. Please contact the foundation.");
    }
    if (payment.status === "authorized" && payment.captured === false && (order.status === "attempted" || order.status === "created")) {
      return json({ verified: false, status: "pending", paymentId: body.paymentId, orderId: claims.orderId }, 202);
    }
    if (payment.status !== "captured" || payment.captured !== true || order.status !== "paid" || order.amount_paid !== claims.amount ||
        order.amount_due !== 0 || payment.amount_refunded !== 0) {
      throw new PaymentError(409, "PAYMENT_NOT_CAPTURED", "Payment is not confirmed as received. Please check your payment reference with the foundation.");
    }
    return json({ verified: true, status: "captured", paymentId: body.paymentId, orderId: claims.orderId, amount: claims.amount, currency: "INR", cause: claims.cause });
  } catch (error) { return fail(error); }
}
