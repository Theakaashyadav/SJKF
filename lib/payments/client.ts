import { paymentApiEndpoint, type PaymentApiAction } from "./api-url.ts";

export async function requestPayment<T>(base: string, action: PaymentApiAction, body?: object, signal?: AbortSignal): Promise<T> {
  const endpoint = paymentApiEndpoint(base, action);
  if (!endpoint) throw new Error("Payment service is not configured");
  const response = await fetch(endpoint, {
    method: action === "config" ? "GET" : "POST",
    // Apps Script has no OPTIONS handler. A plain-text JSON body avoids preflight.
    ...(action === "config" ? {} : {
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify({ ...body, action }),
    }),
    credentials: "omit",
    redirect: "follow",
    cache: "no-store",
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(60000)]) : AbortSignal.timeout(60000),
  });
  const data: unknown = await response.json();
  // ContentService returns HTTP 200 even for application errors.
  if (!response.ok || !data || typeof data !== "object" || !("ok" in data) || data.ok !== true) {
    throw new Error("Payment request unavailable");
  }
  return data as T;
}
