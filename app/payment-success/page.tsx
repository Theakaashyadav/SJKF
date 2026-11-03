import { T } from "@/components/LanguageProvider";
import type { Metadata } from "next";
import Link from "next/link";
import { HeartHandshake, ReceiptText } from "lucide-react";
import { Logo } from "@/components/Logo";
import { organization } from "@/lib/site";

export const metadata: Metadata = { title: "Thank You", robots: { index: false, follow: false } };

export default function PaymentSuccessPage() {
  return (
    <section className="transaction-page">
      <div className="receipt-card">
        <div className="receipt-card__header"><Logo /><p><T>{"Donation follow-up"}</T></p></div>
        <div className="receipt-card__success">
          <HeartHandshake />
          <p className="eyebrow"><T>{"Thank you"}</T></p>
          <h1><T>{"Thank You for Your Support"}</T></h1>
          <p><T>{"Verified Razorpay confirmation appears in the donation form after the payment service confirms capture. Keep your payment reference and contact the foundation if you need an acknowledgement."}</T></p>
        </div>
        <div className="transaction-help"><ReceiptText /><span><T>{"Visiting this page does not verify or confirm a payment. Check the verified result in the donation form or contact the foundation with your transaction reference. Direct UPI and bank transfers require manual reconciliation."}</T></span></div>
        <div className="receipt-card__organization"><p><strong><T>{"Registered office:"}</T></strong> <T>{organization.addressLines.join(", ")}</T></p><p><strong><T>{"CIN:"}</T></strong> {organization.cin}</p><p className="tax-note"><T>{"A payment receipt does not automatically represent an 80G tax-exemption certificate."}</T></p></div>
        <div className="receipt-actions"><Link className="button button--green" href="/contact"><T>{"Contact us"}</T></Link><Link className="button button--outline-dark" href="/"><T>{"Return home"}</T></Link></div>
      </div>
    </section>
  );
}
