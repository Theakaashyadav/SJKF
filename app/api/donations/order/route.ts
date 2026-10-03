import { NextRequest, NextResponse } from "next/server";
import { causeOptions, organization } from "@/lib/site";
import { receiptEmailConfigured } from "@/lib/email";
import { distributedPaymentRateLimit, paymentStoreConfigured, savePendingDonation } from "@/lib/payment-store";
import { createRazorpayOrder } from "@/lib/razorpay";
import { cleanText, clientIp, isEmail, isIndianMobile, jsonError, looksHuman, normalizePhone, originIsAllowed } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!originIsAllowed(request)) return jsonError("Request origin could not be verified.", 403);
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET || !process.env.PAYMENT_RECEIPT_SECRET || !paymentStoreConfigured() || !receiptEmailConfigured()) {
    return jsonError("Secure payments are being configured. Please contact the foundation to contribute.", 503);
  }
  const ip = clientIp(request);
  let limited: { allowed: boolean; retryAfter: number };
  try {
    limited = await distributedPaymentRateLimit("order", ip, 8, 600);
  } catch {
    return jsonError("Secure payments are temporarily unavailable. Please try again shortly.", 503);
  }
  if (!limited.allowed) return jsonError("Too many attempts. Please try again shortly.", 429, { "Retry-After": String(limited.retryAfter) });

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return jsonError("Invalid request.");
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonError("Invalid request.");
  }

  if (!looksHuman(body.startedAt, body.website)) return jsonError("Submission could not be verified.", 400);

  const donorName = cleanText(body.fullName, 100);
  const email = cleanText(body.email, 254).toLowerCase();
  const mobileInput = cleanText(body.mobile, 20);
  const mobile = normalizePhone(mobileInput);
  const cause = cleanText(body.cause, 80);
  const address = cleanText(body.address, 240);
  const message = cleanText(body.message, 240);
  const pan = process.env.DONATION_PAN_ENABLED === "true" ? cleanText(body.pan, 10).toUpperCase() : "";
  const amount = Number(body.amount);

  if (donorName.length < 2) return jsonError("Please enter your full name.");
  if (!isEmail(email)) return jsonError("Please enter a valid email address.");
  if (!isIndianMobile(mobileInput)) return jsonError("Please enter a valid 10-digit Indian mobile number.");
  if (!causeOptions.includes(cause as (typeof causeOptions)[number])) return jsonError("Please select a valid donation cause.");
  if (!Number.isInteger(amount) || amount < 100 || amount > 500000) return jsonError("Donation amount must be between ₹100 and ₹5,00,000.");
  if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) return jsonError("Please enter a valid PAN or leave the field blank.");
  if (body.agreed !== true) return jsonError("Please agree to the donation policies before continuing.");

  try {
    const receipt = `sjpkf_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 8)}`;
    const order = await createRazorpayOrder({
      amountPaise: amount * 100,
      receipt,
      notes: { donation_ref: receipt, cause },
    });
    await savePendingDonation({
      orderId: order.id,
      receipt,
      amountPaise: order.amount,
      currency: "INR",
      donorName,
      email,
      mobile,
      cause,
      ...(address ? { address } : {}),
      ...(message ? { message } : {}),
      ...(pan ? { pan } : {}),
      status: "created",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      organizationName: organization.name,
      description: `Donation toward ${cause}`,
      donor: { name: donorName, email, mobile },
      cause,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to create Razorpay order", error);
    return jsonError("We could not start the secure payment. No amount has been charged. Please try again.", 502);
  }
}
