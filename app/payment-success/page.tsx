import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { CheckCircle2, ReceiptText } from "lucide-react";
import { Logo } from "@/components/Logo";
import { PrintReceiptButton } from "@/components/PrintReceiptButton";
import { organization } from "@/lib/site";
import { readReceiptToken } from "@/lib/receipt";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Payment Confirmed", robots: { index: false, follow: false } };

export default async function PaymentSuccessPage() {
  const receipt = (await cookies()).get("sjpkf_receipt")?.value;
  const data = receipt ? readReceiptToken(receipt) : null;

  if (!data) {
    return (
      <section className="transaction-page"><div className="transaction-card"><ReceiptText /><p className="eyebrow">Receipt unavailable</p><h1>We could not open this acknowledgement.</h1><p>The secure receipt link may be incomplete or expired. If your account was charged, keep your Razorpay reference and contact the foundation.</p><Link className="button button--green" href="/contact">Contact us</Link></div></section>
    );
  }

  return (
    <section className="transaction-page">
      <div className="receipt-card">
        <div className="receipt-card__header"><Logo /><p>Donation acknowledgement</p></div>
        <div className="receipt-card__success"><CheckCircle2 /><p className="eyebrow">Payment verified</p><h1>Thank You for Your Support</h1><p>Your contribution has been securely verified. A confirmation will be sent to the email supplied during payment when email delivery is available.</p></div>
        <dl className="receipt-details">
          <div><dt>Donor name</dt><dd>{data.donorName}</dd></div>
          <div><dt>Donation amount</dt><dd>₹{data.amount.toLocaleString("en-IN")}</dd></div>
          <div><dt>Donation cause</dt><dd>{data.cause}</dd></div>
          <div><dt>Donation date</dt><dd>{data.donatedAt}</dd></div>
          <div><dt>Payment reference</dt><dd>{data.paymentId}</dd></div>
          <div><dt>Order reference</dt><dd>{data.orderId}</dd></div>
        </dl>
        <div className="receipt-card__organization"><p><strong>Registered office:</strong> {organization.addressLines.join(", ")}</p><p><strong>CIN:</strong> {organization.cin}</p><p className="tax-note">This acknowledgement does not represent an 80G tax-exemption certificate.</p></div>
        <div className="receipt-actions"><PrintReceiptButton /><Link className="button button--outline-dark no-print" href="/">Return home</Link></div>
      </div>
    </section>
  );
}
