import type { Metadata } from "next";
import { Suspense } from "react";
import { BadgeCheck, Check, HeartHandshake, LockKeyhole, ReceiptText, ShieldCheck } from "lucide-react";
import { DonationForm } from "@/components/DonationForm";
import { PageHero } from "@/components/PageHero";
import { organization } from "@/lib/site";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata("Donate | Support Swabhiman Foundation", "Make a secure contribution toward animal welfare, education, healthcare, environmental initiatives or community welfare.", "/donate");

export default function DonatePage() {
  return (
    <>
      <PageHero eyebrow="Make a contribution" title="Your Support Can Change a Life." description="Choose a cause and contribute toward meaningful change for people, animals and communities." image="/images/animal-welfare.jpg" />
      <section className="section donation-page">
        <div className="container donation-layout">
          <div className="donation-main">
            <div className="donation-title"><p className="eyebrow">Secure donation</p><h2>Give with confidence.</h2><p>Complete the form below. Payment details are entered only inside Razorpay’s secure hosted checkout.</p></div>
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
              <p>Orders are created on the server. Payment signatures are verified before a contribution is confirmed.</p>
              <div><ShieldCheck /><span>Gateway secret keys never enter browser code.</span></div>
              <div><ReceiptText /><span>Acknowledgement email follows verified payment when email delivery is configured.</span></div>
            </div>
            <div className="registration-mini"><BadgeCheck /><div><span>Registered Section 8 Company</span><strong>CIN: {organization.cin}</strong><strong>DARPAN: {organization.darpanId}</strong></div></div>
            <p className="tax-note"><strong>Tax note:</strong> No 80G tax-exemption benefit is claimed on this website unless a valid applicable approval is separately published and verified.</p>
          </aside>
        </div>
      </section>
    </>
  );
}
