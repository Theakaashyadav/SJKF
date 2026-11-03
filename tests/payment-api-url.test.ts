import assert from "node:assert/strict";
import test from "node:test";
import { paymentApiBase, paymentApiEndpoint } from "../lib/payments/api-url.ts";

test("HTTPS API base builds separate config, order and verification endpoints", () => {
  assert.equal(paymentApiBase(" https://payments.example.test/ "), "https://payments.example.test");
  for (const action of ["config", "order", "verify"] as const) {
    assert.equal(paymentApiEndpoint("https://payments.example.test/", action), `https://payments.example.test/api/payments/${action}/`);
  }
});

test("localhost HTTP is accepted only for local development", () => {
  assert.equal(paymentApiBase("http://localhost:4000/"), "http://localhost:4000");
  assert.equal(paymentApiBase("http://127.0.0.1:4000"), "http://127.0.0.1:4000");
  assert.equal(paymentApiEndpoint("http://localhost:4000", "order"), "http://localhost:4000/api/payments/order/");
});

for (const value of [
  "", "not a URL", "/api/payments", "//payments.example.test", "javascript:alert(1)",
  "http://payments.example.test", "http://localhost.other.example", "http://192.168.0.1:4000",
  "https://key:secret@payments.example.test", "https://payments.example.test/api/payments",
  "https://payments.example.test/nested/", "https://payments.example.test/?key=value",
  "https://payments.example.test/?", "https://payments.example.test/#fragment",
  "https://payments.example.test/#", "https://pay\nments.example.test",
]) {
  test(`invalid API base never falls back to a same-origin route: ${value || "empty"}`, () => {
    assert.equal(paymentApiBase(value), null);
    assert.equal(paymentApiEndpoint(value, "config"), null);
    assert.equal(paymentApiEndpoint(value, "order"), null);
  });
}
