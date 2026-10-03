import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert, RefreshCcw, ShieldCheck } from "lucide-react";
import { PaymentFailureDetails } from "@/components/PaymentFailureDetails";

export const metadata: Metadata = { title: "Payment Not Completed", robots: { index: false, follow: false } };

export default function PaymentFailedPage() {
  return (
    <section className="transaction-page">
      <div className="transaction-card transaction-card--failed">
        <span className="transaction-icon"><CircleAlert /></span>
        <p className="eyebrow">Payment not confirmed</p>
        <h1>We Couldn’t Confirm Your Payment</h1>
        <p>No contribution is recorded on this website unless the gateway response passes server-side verification. If your account was debited, keep the Razorpay payment reference and contact the foundation before trying again.</p>
        <PaymentFailureDetails />
        <div className="transaction-help"><ShieldCheck /><span>Never share an OTP, CVV, card PIN or banking password with anyone claiming to help.</span></div>
        <div className="receipt-actions"><Link className="button button--green" href="/donate"><RefreshCcw />Try again</Link><Link className="button button--outline-dark" href="/contact">Get help</Link></div>
      </div>
    </section>
  );
}
