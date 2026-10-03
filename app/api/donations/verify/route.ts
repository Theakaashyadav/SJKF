import { NextRequest, NextResponse } from "next/server";
import { deliverDonationReceipt } from "@/lib/donation-receipt";
import { distributedPaymentRateLimit, getPendingDonation, paymentStoreConfigured, recordCapturedDonation } from "@/lib/payment-store";
import { createReceiptToken } from "@/lib/receipt";
import { getRazorpayOrder, getRazorpayPayment, verifyPaymentSignature } from "@/lib/razorpay";
import { cleanText, clientIp, jsonError, originIsAllowed } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!originIsAllowed(request)) return jsonError("Request origin could not be verified.", 403);
  if (!paymentStoreConfigured() || !process.env.PAYMENT_RECEIPT_SECRET) return jsonError("Payment verification is temporarily unavailable.", 503);
  const ip = clientIp(request);
  let limited: { allowed: boolean; retryAfter: number };
  try {
    limited = await distributedPaymentRateLimit("verify", ip, 16, 600);
  } catch {
    return jsonError("Payment verification is temporarily unavailable.", 503);
  }
  if (!limited.allowed) return jsonError("Too many verification attempts. Please wait and try again.", 429);

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return jsonError("Invalid verification request.");
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonError("Invalid verification request.");
  }

  const orderId = cleanText(body.razorpay_order_id, 80);
  const paymentId = cleanText(body.razorpay_payment_id, 80);
  const signature = cleanText(body.razorpay_signature, 160);
  if (!orderId || !paymentId || !signature) return jsonError("Payment confirmation is incomplete.");
  if (!/^order_[A-Za-z0-9]+$/.test(orderId) || !/^pay_[A-Za-z0-9]+$/.test(paymentId) || !/^[a-f0-9]{64}$/i.test(signature)) return jsonError("Payment confirmation format is invalid.");

  try {
    const pending = await getPendingDonation(orderId);
    if (!pending || pending.orderId !== orderId) return jsonError("The payment order is not recognized.", 400);
    if (!verifyPaymentSignature(orderId, paymentId, signature)) return jsonError("Payment signature could not be verified.", 400);
    const [order, payment] = await Promise.all([getRazorpayOrder(orderId), getRazorpayPayment(paymentId)]);
    if (payment.order_id !== pending.orderId || order.id !== pending.orderId || payment.amount !== pending.amountPaise || order.amount !== pending.amountPaise || payment.currency !== pending.currency || order.currency !== pending.currency) return jsonError("Payment details do not match the stored order.", 400);
    if (payment.status === "authorized" || (payment.status === "captured" && order.status !== "paid")) {
      return NextResponse.json({ ok: false, pending: true, message: "Payment is authorized and awaiting final capture." }, { status: 409, headers: { "Cache-Control": "no-store", "Retry-After": "2" } });
    }
    if (payment.status !== "captured" || !payment.captured || order.status !== "paid") return jsonError("Payment has not been captured.", 400);

    const captured = await recordCapturedDonation(pending, order, payment);
    const amount = captured.amountPaise / 100;
    const donatedAt = new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(captured.capturedAt));
    const token = createReceiptToken({ paymentId: captured.paymentId, orderId: captured.orderId, donorName: captured.donorName, amount, cause: captured.cause, donatedAt });

    try {
      await deliverDonationReceipt(captured);
    } catch (emailError) {
      console.error("Payment verified but receipt email could not be sent", emailError);
    }

    const response = NextResponse.json({ ok: true, redirect: "/payment-success" }, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
    response.cookies.set("sjpkf_receipt", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", maxAge: 900, path: "/payment-success" });
    return response;
  } catch (error) {
    console.error("Unable to verify Razorpay payment", error);
    return jsonError("We could not verify the payment automatically. If your account was charged, please retain the payment reference and contact us.", 502);
  }
}
