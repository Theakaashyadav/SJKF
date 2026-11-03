import { T } from "@/components/LanguageProvider";
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
      <PageHero eyebrow="Contact us" title="Let’s Create Change Together" description="Whether you want to volunteer, partner or support a cause, we welcome a thoughtful conversation." image="/images/stock/contact-conversation.jpg" />
      <section className="section">
        <div className="container contact-layout">
          <div className="contact-details">
            <p className="eyebrow"><T>{"Get in touch"}</T></p>
            <h2><T>{"Start with a conversation."}</T></h2>
            <p><T>{"Use the form for general questions, volunteering, responsible partnerships or donation assistance. We will route your message to the appropriate person."}</T></p>
            <div className="contact-list">
              <div><span><MapPin /></span><p><strong><T>{"Registered office"}</T></strong>{organization.addressLines.map((line) => <span key={line}><T>{line}</T></span>)}</p></div>
              <div><span><Mail /></span><p><strong><T>{"Email"}</T></strong><a href={`mailto:${organization.email}`}>{organization.email}</a></p></div>
              <div><span><Phone /></span><p><strong><T>{"Phone"}</T></strong><a href={`tel:${organization.phone.replace(/[^\d+]/g, "")}`}>{organization.phone}</a></p></div>
            </div>
            <p className="contact-safety"><T>{"Please do not send Aadhaar numbers, card details, banking passwords or other sensitive personal documents through this form."}</T></p>
          </div>
          <div className="contact-form-card">
            <h2><T>{"Send a message"}</T></h2>
            <p><T>{"Fields marked with * are required."}</T></p>
            <Suspense fallback={<div className="form-loading"><T>{"Preparing the contact form…"}</T></div>}><ContactForm /></Suspense>
          </div>
        </div>
      </section>
      <section className="section section--soft">
        <div className="container involvement-grid">
          <article><Users /><h3><T>{"Volunteer With Us"}</T></h3><p><T>{"Share your time, skills and energy in support of responsibly planned initiatives."}</T></p><Link href="/contact?interest=volunteer"><T>{"Express interest"}</T></Link></article>
          <article><HeartHandshake /><h3><T>{"Partner With Us"}</T></h3><p><T>{"Explore CSR, institutional and local collaborations built around shared accountability."}</T></p><Link href="/contact?interest=partnership"><T>{"Discuss a partnership"}</T></Link></article>
          <article><HandHeart /><h3><T>{"Support a Cause"}</T></h3><p><T>{"Choose an area close to your heart and contribute through secure hosted checkout."}</T></p><Link href="/donate"><T>{"Make a donation"}</T></Link></article>
        </div>
      </section>
    </>
  );
}
