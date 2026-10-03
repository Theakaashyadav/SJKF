import { NextRequest, NextResponse } from "next/server";
import { deliverDonationReceipt } from "@/lib/donation-receipt";
import {
  beginWebhookEvent,
  completeWebhookEvent,
  getPendingDonation,
  paymentStoreConfigured,
  recordCapturedDonation,
  releaseWebhookEvent,
} from "@/lib/payment-store";
import { getRazorpayOrder, getRazorpayPayment, verifyWebhookSignature } from "@/lib/razorpay";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-razorpay-signature") || "";
  const eventId = (request.headers.get("x-razorpay-event-id") || "").trim().slice(0, 160);
  const body = await request.text();
  let eventClaimed = false;

  if (!process.env.RAZORPAY_WEBHOOK_SECRET || !paymentStoreConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Retry-After": "30" } });
  }

  try {
    if (!signature || !verifyWebhookSignature(body, signature)) return NextResponse.json({ ok: false }, { status: 401 });
    if (!eventId) return NextResponse.json({ ok: false }, { status: 400 });

    const claim = await beginWebhookEvent(eventId);
    if (claim === "done") return NextResponse.json({ ok: true, duplicate: true });
    if (claim === "processing") return NextResponse.json({ ok: false, retry: true }, { status: 409, headers: { "Retry-After": "5" } });
    eventClaimed = true;

    const event = JSON.parse(body) as {
      event?: string;
      payload?: { payment?: { entity?: { id?: string; order_id?: string } } };
    };

    if (event.event === "payment.captured") {
      const paymentSnapshot = event.payload?.payment?.entity;
      if (!paymentSnapshot?.id || !paymentSnapshot.order_id) throw new Error("Captured payment webhook is incomplete");
      const [pending, order, payment] = await Promise.all([
        getPendingDonation(paymentSnapshot.order_id),
        getRazorpayOrder(paymentSnapshot.order_id),
        getRazorpayPayment(paymentSnapshot.id),
      ]);
      if (!pending) throw new Error("Donation order is not present in the payment ledger");
      if (payment.order_id !== pending.orderId || order.id !== pending.orderId || payment.amount !== pending.amountPaise || order.amount !== pending.amountPaise || payment.currency !== "INR" || order.currency !== "INR") throw new Error("Gateway data does not match the payment ledger");
      if (payment.status !== "captured" || !payment.captured || order.status !== "paid") throw new Error("Payment capture has not reached a final state");
      const captured = await recordCapturedDonation(pending, order, payment);
      await deliverDonationReceipt(captured);
    }

    await completeWebhookEvent(eventId);
    console.info("Verified Razorpay webhook", { event: event.event, eventId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (eventClaimed) await releaseWebhookEvent(eventId).catch(() => undefined);
    console.error("Razorpay webhook processing failed", error);
    return NextResponse.json({ ok: false }, { status: 500, headers: { "Retry-After": "15" } });
  }
}
