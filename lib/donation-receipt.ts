import { sendDonationReceipt } from "@/lib/email";
import { markReceiptDelivered, receiptDeliveryStatus, type CapturedDonation } from "@/lib/payment-store";

export async function deliverDonationReceipt(donation: CapturedDonation) {
  if (await receiptDeliveryStatus(donation.paymentId) === "sent") return { sent: true, duplicate: true };
  const donatedAt = new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(donation.capturedAt));
  const result = await sendDonationReceipt({
    donorName: donation.donorName,
    email: donation.email,
    amount: donation.amountPaise / 100,
    cause: donation.cause,
    paymentId: donation.paymentId,
    donatedAt,
  });
  if (!result.sent) throw new Error(`Receipt email was not sent (${result.reason})`);
  await markReceiptDelivered(donation.paymentId);
  return { sent: true, duplicate: false };
}
