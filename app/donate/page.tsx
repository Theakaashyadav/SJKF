import { T } from "@/components/LanguageProvider";
import type { Metadata } from "next";
import { Suspense } from "react";
import { BadgeCheck, Check, HeartHandshake, LockKeyhole, ReceiptText, ShieldCheck } from "lucide-react";
import { DonationForm } from "@/components/DonationForm";
import { DirectDonation } from "@/components/DirectDonation";
import { PageHero } from "@/components/PageHero";
import { organization } from "@/lib/site";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata("Donate | Support Swabhiman Foundation", "Support animal welfare, education, healthcare and community welfare through UPI donations, bank transfers or Razorpay checkout.", "/donate");

export default function DonatePage() {
  return (
    <>
      <PageHero eyebrow="Make a contribution" title="Your Support Can Change a Life." description="Choose a cause and contribute toward meaningful change for people, animals and communities." image="/images/stock/donate-support.jpg" />
      <section className="section donation-page">
        <div className="container"><DirectDonation /></div>
        <div className="container donation-layout">
          <div className="donation-main">
            <div className="donation-title"><p className="eyebrow"><T>{"Razorpay checkout"}</T></p><h2><T>{"Another way to give."}</T></h2><p><T>{"Choose an amount and cause below, then enter your donor and payment details in Razorpay Checkout."}</T></p></div>
            <Suspense fallback={<div className="form-loading"><T>{"Preparing the secure donation form…"}</T></div>}><DonationForm /></Suspense>
          </div>
          <aside className="donation-sidebar" aria-label="Donation trust information">
            <div className="donation-summary-card">
              <HeartHandshake />
              <h2><T>{"Your giving, directed with care."}</T></h2>
              <p><T>{"Select a specific cause or choose General Donation so the foundation can direct support to an appropriate priority."}</T></p>
              <ul><li><Check /><T>{"Animal welfare and care"}</T></li><li><Check /><T>{"Education and skills"}</T></li><li><Check /><T>{"Health and environment"}</T></li><li><Check /><T>{"Community support"}</T></li></ul>
            </div>
            <div className="security-card">
              <h3><LockKeyhole /><T>{" Payment security"}</T></h3>
              <p><T>{"Razorpay donations are confirmed only after the payment service verifies a captured payment. Direct UPI and bank transfers require reconciliation by the foundation."}</T></p>
              <div><ShieldCheck /><span><T>{"Confirm the foundation's beneficiary name before completing your payment."}</T></span></div>
              <div><ReceiptText /><span><T>{"Keep your transaction reference when requesting an acknowledgement."}</T></span></div>
            </div>
            <div className="registration-mini"><BadgeCheck /><div><span><T>{"Registered Section 8 Company"}</T></span><strong><T>{"CIN: "}</T>{organization.cin}</strong><strong><T>{"DARPAN: "}</T>{organization.darpanId}</strong></div></div>
            <p className="tax-note"><strong><T>{"Tax note:"}</T></strong><T>{" No 80G tax-exemption benefit is claimed on this website unless a valid applicable approval is separately published and verified."}</T></p>
          </aside>
        </div>
      </section>
    </>
  );
}
