import { paymentApiBase } from "./api-url.ts";

export type Verification = { orderId: string; paymentId: string; signature: string; orderToken: string };
export type PendingPayment = { backend: string; amount: number; cause: string; createdAt: number; details: Verification };
export const pendingPaymentKey = "sjkf:pending-payment:v1";
export const recoveryLifetime = 7 * 24 * 60 * 60 * 1000;

export function parsePendingPayment(value: string | null, backend: string, now = Date.now()): PendingPayment | null {
  if (!value || value.length > 10000) return null;
  try {
    const saved = JSON.parse(value) as PendingPayment;
    if (!saved || !paymentApiBase(backend) || saved.backend !== paymentApiBase(backend)) return null;
    if (!Number.isInteger(saved.amount) || saved.amount < 100 || saved.amount > 500000) return null;
    if (typeof saved.cause !== "string" || saved.cause.length > 100) return null;
    if (!Number.isSafeInteger(saved.createdAt) || saved.createdAt > now || now - saved.createdAt > recoveryLifetime) return null;
    const details = saved.details;
    if (!details || !/^order_[A-Za-z0-9]+$/.test(details.orderId) || !/^pay_[A-Za-z0-9]+$/.test(details.paymentId)) return null;
    if (!/^[a-f0-9]{64}$/i.test(details.signature) || typeof details.orderToken !== "string" || !details.orderToken || details.orderToken.length > 4096) return null;
    return saved;
  } catch {
    return null;
  }
}
