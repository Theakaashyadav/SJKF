import assert from "node:assert/strict";
import test from "node:test";
import { parsePendingPayment, recoveryLifetime, type PendingPayment } from "../lib/payments/pending.ts";

const backend = "https://script.google.com/macros/s/Deployment123/exec";
const now = 1800000000000;
const saved: PendingPayment = {
  backend, amount: 2500, cause: "Education", createdAt: now - 60000,
  details: { orderId: "order_123", paymentId: "pay_123", signature: "a".repeat(64), orderToken: "signed-token" },
};

test("reload recovery preserves the expected amount and signed verification details", () => {
  assert.deepEqual(parsePendingPayment(JSON.stringify(saved), backend, now), saved);
});

test("another deployment or expired/future recovery data cannot restore a checkout", () => {
  assert.equal(parsePendingPayment(JSON.stringify(saved), backend.replace("Deployment123", "Other123"), now), null);
  for (const createdAt of [now + 1, now - recoveryLifetime - 1, "yesterday", null]) {
    assert.equal(parsePendingPayment(JSON.stringify({ ...saved, createdAt }), backend, now), null);
  }
});

test("corrupt and malformed recovery data is ignored", () => {
  for (const value of [null, "invalid JSON", "null", "{}", "x".repeat(10001)]) {
    assert.equal(parsePendingPayment(value, backend, now), null);
  }
  for (const patch of [
    { amount: 99 }, { amount: 500001 }, { amount: 100.5 }, { amount: "2500" }, { cause: {} },
    { details: null }, { details: { ...saved.details, orderId: "untrusted" } },
    { details: { ...saved.details, signature: "invalid" } }, { details: { ...saved.details, orderToken: "" } },
  ]) {
    assert.equal(parsePendingPayment(JSON.stringify({ ...saved, ...patch }), backend, now), null);
  }
});
