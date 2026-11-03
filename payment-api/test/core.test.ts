import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { handleConfigRequest, handleOrderRequest, handleVerifyRequest } from "../src/razorpay.ts";
import { createPaymentThrottle } from "../src/throttle.ts";
import { allowedOrigins } from "../src/origins.ts";

const env = { RAZORPAY_KEY_ID: "rzp_test_localtest", RAZORPAY_KEY_SECRET: "local_mock_secret_not_a_real_key", PAYMENT_ALLOWED_ORIGINS: "https://foundation.example" };
const now = 1800000000000;
const origin = "https://foundation.example";
const order = { id: "order_localtest123", amount: 100000, currency: "INR", status: "created" };
const paidOrder = { ...order, status: "paid", amount_paid: 100000, amount_due: 0 };
const payment = { id: "pay_localtest123", order_id: order.id, amount: 100000, currency: "INR", status: "captured", captured: true, amount_refunded: 0 };
const signature = createHmac("sha256", env.RAZORPAY_KEY_SECRET).update(`${order.id}|${payment.id}`).digest("hex");

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request(`${origin}/api/payments/order/`, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin, ...headers }, body: JSON.stringify(body) });
}

function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => handler(String(input), init)) as typeof fetch;
}

const noNetwork = mockFetch(() => { throw new Error("Unexpected provider call in validation test"); });

async function checkoutToken() {
  const response = await handleOrderRequest(request({ amount: 1000, cause: "Animal Welfare" }), { env, now: () => now, fetch: mockFetch(() => Response.json(order)) });
  assert.equal(response.status, 200);
  const body = await response.json();
  return body.orderToken as string;
}

async function verify(providerPayment: Record<string, unknown> = payment, providerOrder: Record<string, unknown> = paidOrder, changes: Record<string, unknown> = {}, clock = now) {
  const orderToken = await checkoutToken();
  return handleVerifyRequest(request({ orderId: order.id, paymentId: payment.id, signature, orderToken, ...changes }), {
    env, now: () => clock,
    fetch: mockFetch((url) => Response.json(url.includes("/payments/") ? providerPayment : providerOrder)),
  });
}

test("configuration exposes only the public key and reports missing credentials", async () => {
  const response = handleConfigRequest({ env });
  assert.deepEqual(await response.json(), { configured: true, keyId: env.RAZORPAY_KEY_ID });
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await handleConfigRequest({ env: {} }).json(), { configured: false });
  assert.deepEqual(await handleConfigRequest({ env: { RAZORPAY_KEY_ID: env.RAZORPAY_KEY_ID } }).json(), { configured: false });
});

test("order creation validates amount, sends paise and returns a signed order without the secret", async () => {
  let called = false;
  const response = await handleOrderRequest(request({ amount: 1000, cause: "Animal Welfare" }), {
    env, now: () => now,
    fetch: mockFetch((url, init) => {
      called = true;
      assert.equal(url, "https://api.razorpay.com/v1/orders");
      assert.equal(init?.method, "POST");
      assert.equal(new Headers(init?.headers).get("Authorization"), `Basic ${Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64")}`);
      const data = JSON.parse(init?.body as string);
      assert.equal(data.amount, 100000);
      assert.equal(data.currency, "INR");
      assert.equal(data.partial_payment, false);
      assert.equal(data.notes.cause, "Animal Welfare");
      assert.ok(data.receipt.length <= 40);
      return Response.json(order);
    }),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.orderId, order.id);
  assert.equal(body.amount, 100000);
  assert.equal(body.currency, "INR");
  assert.match(body.orderToken, /^[A-Za-z0-9_-]+\.[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(body).includes(env.RAZORPAY_KEY_SECRET), false);
  assert.equal(called, true);
});

for (const amount of [99, 500001, 100.5, "1000", null, -1]) {
  test(`order rejects invalid amount ${String(amount)} without a provider request`, async () => {
    const response = await handleOrderRequest(request({ amount, cause: "Animal Welfare" }), { env, fetch: noNetwork });
    assert.equal(response.status, 400);
  });
}

test("order rejects unknown causes and extra fields", async () => {
  for (const body of [{ amount: 1000, cause: "Unknown" }, { amount: 1000, cause: "General Donation", currency: "USD" }]) {
    assert.equal((await handleOrderRequest(request(body), { env, fetch: noNetwork })).status, 400);
  }
});

test("order rejects wrong or missing origin, non-JSON content and oversized bodies", async () => {
  assert.equal((await handleOrderRequest(request({ amount: 1000, cause: "General Donation" }, { Origin: "https://other.example" }), { env, fetch: noNetwork })).status, 403);
  const missing = request({ amount: 1000, cause: "General Donation" });
  missing.headers.delete("Origin");
  assert.equal((await handleOrderRequest(missing, { env, fetch: noNetwork })).status, 403);
  assert.equal((await handleOrderRequest(request({}, { "Content-Type": "text/plain" }), { env, fetch: noNetwork })).status, 415);
  assert.equal((await handleOrderRequest(request({ cause: "x".repeat(5000) }), { env, fetch: noNetwork })).status, 413);
});

test("approved static website origins may make cross-site API requests", async () => {
  const response = await handleOrderRequest(request({ amount: 99, cause: "General Donation" }, { "sec-fetch-site": "cross-site", Host: "api.example" }), { env, fetch: noNetwork });
  assert.equal(response.status, 400, "Approved origin reaches amount validation");
  assert.equal((await response.json()).error, "INVALID_PAYMENT_REQUEST");
});

test("API Host, request URL and former website settings cannot grant origin access", async () => {
  const input = request({ amount: 99, cause: "General Donation" }, { Host: "foundation.example", "x-forwarded-host": "foundation.example" });
  const response = await handleOrderRequest(input, { env: { ...env, PAYMENT_ALLOWED_ORIGINS: "", NEXT_PUBLIC_SITE_URL: origin }, fetch: noNetwork });
  assert.equal(response.status, 403);
});

test("origin allowlist accepts HTTPS or local development HTTP and rejects unsafe entries", () => {
  const origins = allowedOrigins({ PAYMENT_ALLOWED_ORIGINS: "https://foundation.example,http://localhost:3000,http://127.0.0.1:3000,http://[::1]:3000,http://insecure.example,https://user@private.example,https://path.example/donate,https://query.example?x=1,*" });
  assert.deepEqual([...origins], ["https://foundation.example", "http://localhost:3000", "http://127.0.0.1:3000", "http://[::1]:3000"]);
});

test("order reports missing credentials without an upstream request", async () => {
  const response = await handleOrderRequest(request({ amount: 1000, cause: "General Donation" }), { env: { PAYMENT_ALLOWED_ORIGINS: origin }, fetch: noNetwork });
  assert.equal(response.status, 503);
});

test("provider failures are generic and do not reveal account errors or the secret", async () => {
  const response = await handleOrderRequest(request({ amount: 1000, cause: "General Donation" }), {
    env,
    fetch: mockFetch(() => Response.json({ error: { description: `Private error ${env.RAZORPAY_KEY_SECRET}` } }, { status: 401 })),
  });
  assert.equal(response.status, 502);
  const body = await response.text();
  assert.equal(body.includes(env.RAZORPAY_KEY_SECRET), false);
  assert.equal(body.includes("Private error"), false);
});

test("unexpected provider order amount cannot be returned as a checkout", async () => {
  const response = await handleOrderRequest(request({ amount: 1000, cause: "General Donation" }), { env, fetch: mockFetch(() => Response.json({ ...order, amount: 999 })) });
  assert.equal(response.status, 502);
});

test("captured payment and fully paid matching order are verified", async () => {
  const response = await verify();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { verified: true, status: "captured", paymentId: payment.id, orderId: order.id, amount: 100000, currency: "INR", cause: "Animal Welfare" });
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("an authorized payment remains pending and is never represented as received", async () => {
  const response = await verify({ ...payment, status: "authorized", captured: false }, { ...paidOrder, status: "attempted", amount_paid: 0, amount_due: 100000 });
  assert.equal(response.status, 202);
  assert.equal((await response.json()).verified, false);
});

test("tampered checkout token is rejected before provider lookup", async () => {
  const token = await checkoutToken();
  const [payload, mac] = token.split(".");
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
  const tampered = `${Buffer.from(JSON.stringify({ ...claims, amount: 10000 })).toString("base64url")}.${mac}`;
  const response = await handleVerifyRequest(request({ orderId: order.id, paymentId: payment.id, signature, orderToken: tampered }), { env, now: () => now, fetch: noNetwork });
  assert.equal(response.status, 400);
});

test("expired token, substituted order and invalid payment signature are rejected", async () => {
  assert.equal((await verify(payment, paidOrder, {}, now + 2 * 60 * 60 * 1000 + 1)).status, 400);
  assert.equal((await verify(payment, paidOrder, { orderId: "order_someotherorder" })).status, 400);
  assert.equal((await verify(payment, paidOrder, { signature: "0".repeat(64) })).status, 400);
});

for (const changes of [{ amount: 10000 }, { currency: "USD" }, { order_id: "order_other" }, { id: "pay_other" }]) {
  test(`provider payment mismatch ${Object.keys(changes)[0]} is rejected`, async () => {
    assert.equal((await verify({ ...payment, ...changes })).status, 400);
  });
}

test("provider order mismatch, unpaid state and refunded payment are not confirmed", async () => {
  assert.equal((await verify(payment, { ...paidOrder, amount: 10000 })).status, 400);
  assert.equal((await verify(payment, { ...paidOrder, status: "attempted", amount_paid: 0, amount_due: 100000 })).status, 409);
  assert.equal((await verify({ ...payment, amount_refunded: 10000 })).status, 409);
  assert.equal((await verify({ ...payment, amount_refunded: undefined })).status, 409);
  assert.equal((await verify({ ...payment, status: "failed", captured: false })).status, 409);
});

test("verification provider failures are generic and never treated as confirmed", async () => {
  const orderToken = await checkoutToken();
  const response = await handleVerifyRequest(request({ orderId: order.id, paymentId: payment.id, signature, orderToken }), {
    env, now: () => now,
    fetch: mockFetch(() => { throw new Error(`Private transport failure ${env.RAZORPAY_KEY_SECRET}`); }),
  });
  assert.equal(response.status, 502);
  const body = await response.json();
  assert.equal(body.error, "PAYMENT_PROVIDER_UNAVAILABLE");
  assert.equal(JSON.stringify(body).includes(env.RAZORPAY_KEY_SECRET), false);
  assert.equal(body.verified, undefined);
});

test("payment throttle separates clients and endpoints, returns Retry-After and resets with time", async () => {
  let time = 1000;
  const throttle = createPaymentThrottle({ now: () => time });
  const client = new Request(origin, { headers: { "x-forwarded-for": "192.0.2.1, 192.0.2.99" } });
  for (let index = 0; index < 10; index++) assert.equal(throttle(client, "order"), null);
  const limited = throttle(client, "order");
  assert.equal(limited?.status, 429);
  assert.equal(limited?.headers.get("Retry-After"), "60");
  assert.equal(limited?.headers.get("Cache-Control"), "no-store");
  assert.equal((await limited?.json()).error, "PAYMENT_RATE_LIMITED");
  assert.equal(throttle(new Request(origin, { headers: { "x-real-ip": "192.0.2.2" } }), "order"), null);
  for (let index = 0; index < 30; index++) assert.equal(throttle(client, "verify"), null);
  assert.equal(throttle(client, "verify")?.status, 429);
  time += 60_000;
  assert.equal(throttle(client, "order"), null);
});

test("payment throttle bounds stored clients and cleans expired windows", () => {
  let time = 1000;
  const state = new Map<string, { count: number; expiresAt: number }>();
  const throttle = createPaymentThrottle({ now: () => time, maxEntries: 2, state });
  for (const address of ["192.0.2.1", "192.0.2.2"]) {
    assert.equal(throttle(new Request(origin, { headers: { "x-real-ip": address } }), "order"), null);
  }
  assert.equal(throttle(new Request(origin, { headers: { "x-real-ip": "192.0.2.3" } }), "order")?.status, 429);
  assert.equal(state.size, 2);
  time += 60_000;
  assert.equal(throttle(new Request(origin, { headers: { "x-real-ip": "192.0.2.3" } }), "order"), null);
  assert.equal(state.size, 1);
});

test("process-wide payment cap applies when proxy address hints rotate", () => {
  const throttle = createPaymentThrottle({ now: () => 1000 });
  for (let index = 1; index <= 120; index++) {
    assert.equal(throttle(new Request(origin, { headers: { "x-real-ip": `192.0.2.${index}` } }), "order"), null);
  }
  assert.equal(throttle(new Request(origin, { headers: { "x-real-ip": "192.0.2.121" } }), "order")?.status, 429);
});
