import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { request as nodeRequest } from "node:http";
import test from "node:test";
import { createPaymentServer } from "../src/http.ts";

const websiteOrigin = "https://static.foundation.example";
const env = { RAZORPAY_KEY_ID: "rzp_test_httpmock", RAZORPAY_KEY_SECRET: "mock_http_secret_never_a_real_key", PAYMENT_ALLOWED_ORIGINS: `${websiteOrigin},http://localhost:3000,http://127.0.0.1:3000` };
const order = { id: "order_httpmock123", amount: 100000, currency: "INR", status: "created" };
const payment = { id: "pay_httpmock123", order_id: order.id, amount: order.amount, currency: "INR", status: "captured", captured: true, amount_refunded: 0 };
const paidOrder = { ...order, status: "paid", amount_paid: order.amount, amount_due: 0 };
const now = 1800000000000;

function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => handler(String(input), init)) as typeof fetch;
}

async function withServer(run: (base: string, calls: string[]) => Promise<void>, provider: (url: string, init?: RequestInit) => Response | Promise<Response> = () => { throw new Error("Unexpected provider call"); }) {
  const calls: string[] = [];
  const server = createPaymentServer({ env, now: () => now, fetch: mockFetch((url, init) => { calls.push(url); return provider(url, init); }) });
  try {
    await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    await run(`http://127.0.0.1:${address.port}`, calls);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

function post(base: string, path: string, body: unknown, origin = websiteOrigin, extra: Record<string, string> = {}) {
  return fetch(`${base}${path}`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json", "sec-fetch-site": "cross-site", ...extra }, body: JSON.stringify(body) });
}

test("local HTTP health and public config expose no private credential", async () => {
  await withServer(async (base, calls) => {
    assert.deepEqual(await (await fetch(`${base}/health`)).json(), { ok: true });
    const config = await fetch(`${base}/api/payments/config/`);
    assert.equal(config.status, 200);
    assert.deepEqual(await config.json(), { configured: true, keyId: env.RAZORPAY_KEY_ID });
    assert.equal(config.headers.get("access-control-allow-origin"), null);
    assert.equal(config.headers.get("cache-control"), "no-store");
    const fromBrowser = await fetch(`${base}/api/payments/config/`, { headers: { Origin: websiteOrigin } });
    assert.equal(fromBrowser.headers.get("access-control-allow-origin"), websiteOrigin);
    assert.equal((await fromBrowser.text()).includes(env.RAZORPAY_KEY_SECRET), false);
    assert.equal(calls.length, 0);
  });
});

test("CORS preflight permits only exact approved origins, JSON headers and GET/POST", async () => {
  await withServer(async (base, calls) => {
    const response = await fetch(`${base}/api/payments/order/`, { method: "OPTIONS", headers: { Origin: websiteOrigin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type" } });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get("access-control-allow-origin"), websiteOrigin);
    assert.equal(response.headers.get("vary"), "Origin");
    assert.equal(response.headers.get("access-control-allow-credentials"), null);
    assert.equal(response.headers.get("access-control-allow-headers"), "Content-Type");
    for (const changes of [{ Origin: "https://unlisted.example" }, { "Access-Control-Request-Method": "DELETE" }, { "Access-Control-Request-Headers": "authorization" }]) {
      const denied = await fetch(`${base}/api/payments/order/`, { method: "OPTIONS", headers: { Origin: websiteOrigin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type", ...changes } });
      assert.equal(denied.status, 403);
    }
    assert.equal(calls.length, 0);
  });
});

test("unlisted or absent POST Origin is rejected before any provider request", async () => {
  await withServer(async (base, calls) => {
    const wrong = await post(base, "/api/payments/order/", { amount: 1000, cause: "General Donation" }, "https://unlisted.example");
    assert.equal(wrong.status, 403);
    assert.equal(wrong.headers.get("access-control-allow-origin"), null);
    const absent = await fetch(`${base}/api/payments/order/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: 1000, cause: "General Donation" }) });
    assert.equal(absent.status, 403);
    assert.equal(calls.length, 0);
  });
});

test("HTTP adapter bounds declared and chunked bodies and returns JSON validation errors", async () => {
  await withServer(async (base, calls) => {
    const badJson = await fetch(`${base}/api/payments/order/`, { method: "POST", headers: { Origin: websiteOrigin, "Content-Type": "application/json" }, body: "{" });
    assert.equal(badJson.status, 400);
    const notJson = await post(base, "/api/payments/order/", {}, websiteOrigin, { "Content-Type": "text/plain" });
    assert.equal(notJson.status, 415);
    const tooLarge = await post(base, "/api/payments/order/", { amount: 1000, cause: "x".repeat(5000) });
    assert.equal(tooLarge.status, 413);
    assert.equal(tooLarge.headers.get("access-control-allow-origin"), websiteOrigin);
    const chunkedStatus = await new Promise<number>((resolve, reject) => {
      const request = nodeRequest(`${base}/api/payments/order/`, { method: "POST", headers: { Origin: websiteOrigin, "Content-Type": "application/json", "Transfer-Encoding": "chunked" } }, (response) => {
        response.resume();
        response.on("end", () => resolve(response.statusCode || 0));
      });
      request.on("error", reject);
      request.write("x".repeat(2500));
      request.end("x".repeat(2500));
    });
    assert.equal(chunkedStatus, 413);
    assert.equal(calls.length, 0);
  });
});

test("approved cross-site static checkout creates and verifies a fully captured payment over HTTP", async () => {
  await withServer(async (base, calls) => {
    const created = await post(base, "/api/payments/order/", { amount: 1000, cause: "Animal Welfare" });
    assert.equal(created.status, 200);
    assert.equal(created.headers.get("access-control-allow-origin"), websiteOrigin);
    const body = await created.json();
    const signature = createHmac("sha256", env.RAZORPAY_KEY_SECRET).update(`${order.id}|${payment.id}`).digest("hex");
    const confirmed = await post(base, "/api/payments/verify/", { orderId: body.orderId, paymentId: payment.id, signature, orderToken: body.orderToken });
    assert.equal(confirmed.status, 200);
    const result = await confirmed.json();
    assert.equal(result.verified, true);
    assert.equal(result.amount, 100000);
    assert.equal(result.status, "captured");
    assert.equal(JSON.stringify([body, result]).includes(env.RAZORPAY_KEY_SECRET), false);
    assert.equal(calls.length, 3);
  }, (url, init) => Response.json(init?.method === "POST" ? order : url.includes("/payments/") ? payment : paidOrder));
});

test("authorized payment remains pending over HTTP rather than confirming a donation", async () => {
  await withServer(async (base) => {
    const body = await (await post(base, "/api/payments/order/", { amount: 1000, cause: "Animal Welfare" }, "http://localhost:3000")).json();
    const signature = createHmac("sha256", env.RAZORPAY_KEY_SECRET).update(`${order.id}|${payment.id}`).digest("hex");
    const response = await post(base, "/api/payments/verify/", { orderId: body.orderId, paymentId: payment.id, signature, orderToken: body.orderToken }, "http://localhost:3000");
    assert.equal(response.status, 202);
    assert.equal((await response.json()).verified, false);
  }, (url, init) => Response.json(init?.method === "POST" ? order : url.includes("/payments/") ? { ...payment, status: "authorized", captured: false } : { ...paidOrder, status: "attempted", amount_paid: 0, amount_due: 100000 }));
});

test("HTTP throttle returns CORS-aware Retry-After without growing unbounded state", async () => {
  await withServer(async (base, calls) => {
    for (let index = 0; index < 10; index++) assert.equal((await post(base, "/api/payments/order/", { amount: 99, cause: "General Donation" })).status, 400);
    const response = await post(base, "/api/payments/order/", { amount: 99, cause: "General Donation" });
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("retry-after"), "60");
    assert.equal(response.headers.get("access-control-allow-origin"), websiteOrigin);
    assert.equal(calls.length, 0);
  });
});
