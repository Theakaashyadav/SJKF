import assert from "node:assert/strict";
import test from "node:test";
import { paymentApiBase, paymentApiEndpoint } from "../lib/payments/api-url.ts";

const deployment = "https://script.google.com/macros/s/AKfycb_Deployment-123/exec";

test("production Apps Script URL preserves its deployment path for every action", () => {
  assert.equal(paymentApiBase(` ${deployment}/ `), deployment);
  for (const action of ["config", "order", "verify"] as const) {
    assert.equal(paymentApiEndpoint(deployment, action), `${deployment}?action=${action}`);
  }
});

for (const value of [
  "", "not a URL", "/api/payments", "//script.google.com/macros/s/123/exec", "javascript:alert(1)",
  "http://script.google.com/macros/s/123/exec", "http://localhost:4000", "https://payments.example.test",
  "https://key:secret@script.google.com/macros/s/123/exec", "https://script.google.com/macros/s/123/dev",
  "https://script.google.com/macros/s/123/exec?key=value", "https://script.google.com/macros/s/123/exec?",
  "https://script.google.com/macros/s/123/exec#fragment", "https://script.google.com/macros/s/123/exec#",
  "https://script.google.com/macros/s/123/exec/order", "https://script.google.com/macros/s//exec",
  "https://script.google.com.evil.example/macros/s/123/exec", "https://script.google.com:8443/macros/s/123/exec",
  "https://script.googleusercontent.com/macros/echo", "https://scr\nipt.google.com/macros/s/123/exec",
]) {
  test(`invalid deployment never falls back to a website payment route: ${value || "empty"}`, () => {
    assert.equal(paymentApiBase(value), null);
    assert.equal(paymentApiEndpoint(value, "config"), null);
    assert.equal(paymentApiEndpoint(value, "order"), null);
  });
}
