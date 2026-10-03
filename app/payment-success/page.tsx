import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ReceiptText } from "lucide-react";
import { Logo } from "@/components/Logo";
import { organization } from "@/lib/site";

export const metadata: Metadata = { title: "Thank You", robots: { index: false, follow: false } };

export default function PaymentSuccessPage() {
  return (
    <section className="transaction-page">
      <div className="receipt-card">
        <div className="receipt-card__header"><Logo /><p>Donation follow-up</p></div>
        <div className="receipt-card__success">
          <CheckCircle2 />
          <p className="eyebrow">Thank you</p>
          <h1>Thank You for Your Support</h1>
          <p>If Razorpay displayed a successful payment confirmation, please keep the payment reference or email receipt for your records.</p>
        </div>
        <div className="transaction-help"><ReceiptText /><span>This page is informational and does not independently verify a transaction. The foundation confirms contributions against Razorpay’s transaction records.</span></div>
        <div className="receipt-card__organization"><p><strong>Registered office:</strong> {organization.addressLines.join(", ")}</p><p><strong>CIN:</strong> {organization.cin}</p><p className="tax-note">A payment receipt does not automatically represent an 80G tax-exemption certificate.</p></div>
        <div className="receipt-actions"><Link className="button button--green" href="/contact">Contact us</Link><Link className="button button--outline-dark" href="/">Return home</Link></div>
      </div>
    </section>
  );
}
