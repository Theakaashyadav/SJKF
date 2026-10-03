import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { HandHeart, HeartHandshake, Mail, MapPin, Phone, Users } from "lucide-react";
import { ContactForm } from "@/components/ContactForm";
import { PageHero } from "@/components/PageHero";
import { organization } from "@/lib/site";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata("Contact Us | Swabhiman Foundation", "Contact Swabhiman Foundation about volunteering, partnerships, donations and community welfare initiatives in Uttar Pradesh.", "/contact");

export default function ContactPage() {
  return (
    <>
      <PageHero eyebrow="Contact us" title="Let’s Create Change Together" description="Whether you want to volunteer, partner or support a cause, we welcome a thoughtful conversation." image="/images/community-support.jpg" />
      <section className="section">
        <div className="container contact-layout">
          <div className="contact-details">
            <p className="eyebrow">Get in touch</p>
            <h2>Start with a conversation.</h2>
            <p>Use the form for general questions, volunteering, responsible partnerships or donation assistance. We will route your message to the appropriate person.</p>
            <div className="contact-list">
              <div><span><MapPin /></span><p><strong>Registered office</strong>{organization.addressLines.map((line) => <span key={line}>{line}</span>)}</p></div>
              <div><span><Mail /></span><p><strong>Email</strong><span>{organization.email || "Official email will be published after verification"}</span></p></div>
              <div><span><Phone /></span><p><strong>Phone</strong><span>{organization.phone || "Official phone number will be published after verification"}</span></p></div>
            </div>
            <p className="contact-safety">Please do not send Aadhaar numbers, card details, banking passwords or other sensitive personal documents through this form.</p>
          </div>
          <div className="contact-form-card">
            <h2>Send a message</h2>
            <p>Fields marked with * are required.</p>
            <Suspense fallback={<div className="form-loading">Preparing the contact form…</div>}><ContactForm /></Suspense>
          </div>
        </div>
      </section>
      <section className="section section--soft">
        <div className="container involvement-grid">
          <article><Users /><h3>Volunteer With Us</h3><p>Share your time, skills and energy in support of responsibly planned initiatives.</p><Link href="/contact?interest=volunteer">Express interest</Link></article>
          <article><HeartHandshake /><h3>Partner With Us</h3><p>Explore CSR, institutional and local collaborations built around shared accountability.</p><Link href="/contact?interest=partnership">Discuss a partnership</Link></article>
          <article><HandHeart /><h3>Support a Cause</h3><p>Choose an area close to your heart and contribute through secure hosted checkout.</p><Link href="/donate">Make a donation</Link></article>
        </div>
      </section>
    </>
  );
}
