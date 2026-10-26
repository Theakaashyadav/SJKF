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
            <div className="donation-title"><p className="eyebrow">Razorpay checkout</p><h2>Another way to give.</h2><p>Choose an amount below to use Razorpay. Your cause, donor details and payment details are entered inside its secure hosted checkout when available.</p></div>
            <Suspense fallback={<div className="form-loading">Preparing the secure donation form…</div>}><DonationForm /></Suspense>
          </div>
          <aside className="donation-sidebar" aria-label="Donation trust information">
            <div className="donation-summary-card">
              <HeartHandshake />
              <h2>Your giving, directed with care.</h2>
              <p>Select a specific cause or choose General Donation so the foundation can direct support to an appropriate priority.</p>
              <ul><li><Check />Animal welfare and care</li><li><Check />Education and skills</li><li><Check />Health and environment</li><li><Check />Community support</li></ul>
            </div>
            <div className="security-card">
              <h3><LockKeyhole /> Payment security</h3>
              <p>Complete UPI payments in your UPI app and bank transfers through your bank. Razorpay handles its own checkout and payment confirmation.</p>
              <div><ShieldCheck /><span>Confirm the foundation&apos;s beneficiary name before completing your payment.</span></div>
              <div><ReceiptText /><span>Keep your transaction reference when requesting an acknowledgement.</span></div>
            </div>
            <div className="registration-mini"><BadgeCheck /><div><span>Registered Section 8 Company</span><strong>CIN: {organization.cin}</strong><strong>DARPAN: {organization.darpanId}</strong></div></div>
            <p className="tax-note"><strong>Tax note:</strong> No 80G tax-exemption benefit is claimed on this website unless a valid applicable approval is separately published and verified.</p>
          </aside>
        </div>
      </section>
    </>
  );
}
