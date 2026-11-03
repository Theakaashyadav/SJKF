import { T } from "@/components/LanguageProvider";
import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert, RefreshCcw, ShieldCheck } from "lucide-react";

export const metadata: Metadata = { title: "Payment Follow-up", robots: { index: false, follow: false } };

export default function PaymentFailedPage() {
  return (
    <section className="transaction-page">
      <div className="transaction-card transaction-card--failed">
        <span className="transaction-icon"><CircleAlert /></span>
        <p className="eyebrow"><T>{"Payment follow-up"}</T></p>
        <h1><T>{"Check Your Payment Status"}</T></h1>
        <p><T>{"This page does not verify your payment status. A Razorpay contribution is confirmed in the donation form only after server verification of a captured payment. If your payment is pending or your account was debited without confirmation, keep the reference and contact the foundation before paying again."}</T></p>
        <div className="transaction-help"><ShieldCheck /><span><T>{"Never share an OTP, CVV, card PIN or banking password with anyone claiming to help."}</T></span></div>
        <div className="receipt-actions"><Link className="button button--green" href="/donate"><RefreshCcw /><T>{"Return to donations"}</T></Link><Link className="button button--outline-dark" href="/contact"><T>{"Get help"}</T></Link></div>
      </div>
    </section>
  );
}
