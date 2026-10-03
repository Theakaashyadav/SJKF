import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  Equal,
  Eye,
  HandHeart,
  Heart,
  Leaf,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { SectionHeading } from "@/components/SectionHeading";
import { organization } from "@/lib/site";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata("About Us | Swabhiman Jan Evam Pashu Kalyan Foundation", "Learn about Swabhiman Foundation's purpose, vision, mission, values, leadership and verified registration details.", "/about");

const values = [
  { name: "Compassion", text: "We respond to need with empathy and respect for every life.", icon: Heart },
  { name: "Integrity", text: "We act honestly, responsibly and in the public interest.", icon: Scale },
  { name: "Transparency", text: "We communicate our identity, intentions and use of support clearly.", icon: Eye },
  { name: "Equality", text: "We believe dignity and opportunity should be accessible to all.", icon: Equal },
  { name: "Responsibility", text: "We plan carefully and remain accountable for our actions.", icon: ShieldCheck },
  { name: "Sustainability", text: "We seek solutions that protect tomorrow as well as today.", icon: Leaf },
  { name: "Service", text: "We put community needs and shared wellbeing at the centre.", icon: HandHeart },
];

const objectives = [
  "Support humane animal rescue, care, rehabilitation and protection.",
  "Expand access to education, literacy resources and practical skills.",
  "Promote preventive healthcare awareness and responsible medical support.",
  "Encourage environmental protection, cleanliness and sustainable practices.",
  "Strengthen women, youth, children and economically vulnerable families.",
  "Contribute to rural development, community resilience and emergency relief.",
];

export default function AboutPage() {
  return (
    <>
      <PageHero eyebrow="About us" title="About Swabhiman Foundation" description="Compassion, responsibility and sustainable change—brought together through service." image="/images/hero-community.jpg" />

      <section className="section">
        <div className="container story-grid">
          <div className="story-media">
            <Image src="/images/community-support.jpg" alt="Women and a child at a rural community event in India" fill sizes="(max-width: 850px) 100vw, 45vw" />
            <div className="stock-disclosure">Representative photography · Not an organizational project record</div>
          </div>
          <div>
            <SectionHeading eyebrow="Our story" title="Purpose Built Around Dignity and Care" />
            <div className="prose-copy">
              <p>Swabhiman Jan Evam Pashu Kalyan Foundation was incorporated on 20 June 2026 as a Section 8 non-profit organization in Uttar Pradesh.</p>
              <p>Our purpose brings human welfare and animal welfare into one shared vision. We believe compassionate societies protect vulnerable people, care for animals and invest in the health of their communities and environment.</p>
              <p>As a new organization, we are building responsibly: establishing strong partnerships, listening to local needs and creating a transparent foundation for long-term service.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--forest">
        <div className="container vision-mission-grid">
          <article>
            <span>Vision</span>
            <h2>A society where every life can move forward with dignity.</h2>
            <p>To help create a society where people, animals and communities can live with dignity, opportunity, compassion and sustainable support.</p>
          </article>
          <article>
            <span>Mission</span>
            <h2>Sustainable action rooted in service and responsibility.</h2>
            <p>To undertake sustainable initiatives in animal welfare, education, healthcare, environmental conservation and community development while empowering vulnerable sections of society.</p>
          </article>
        </div>
      </section>

      <section className="section section--soft">
        <div className="container">
          <SectionHeading eyebrow="What guides us" title="Our Core Values" description="These principles shape how we plan, partner, communicate and serve." centered />
          <div className="values-grid">
            {values.map((value) => {
              const Icon = value.icon;
              return <article key={value.name}><Icon /><h3>{value.name}</h3><p>{value.text}</p></article>;
            })}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container objectives-grid">
          <SectionHeading eyebrow="Our objectives" title="A Connected Approach to Community Wellbeing" description="Our registered objectives cover interrelated areas of need, allowing initiatives to be shaped responsibly around local context." />
          <ol className="objective-list">
            {objectives.map((objective, index) => <li key={objective}><span>{String(index + 1).padStart(2, "0")}</span><p>{objective}</p></li>)}
          </ol>
        </div>
      </section>

      <section className="section section--soft">
        <div className="container">
          <SectionHeading eyebrow="Governance" title="Leadership" description="Board-level leadership responsible for the foundation's direction, governance and public-interest purpose." centered />
          <div className="leadership-grid">
            <article><div className="profile-monogram">SS</div><div><h3>Sonu Sharma</h3><p>Director</p></div></article>
            <article><div className="profile-monogram">KS</div><div><h3>Kamal Sharma</h3><p>Director / Board Member</p></div></article>
          </div>
          <p className="leadership-note">Only organization-level roles are shown. Personal director identifiers and private residential information are not published.</p>
        </div>
      </section>

      <section className="section registration-section">
        <div className="container">
          <div className="registration-intro">
            <SectionHeading eyebrow="Registration & transparency" title="Verified Public Information" description="Our core registration details are available here to support informed giving and responsible partnerships." />
            <ShieldCheck aria-hidden="true" />
          </div>
          <div className="registration-grid">
            <article><Sparkles /><span>Organization type</span><strong>Section 8 Non-Profit Organization</strong></article>
            <article><BadgeCheck /><span>Corporate Identity Number</span><strong>{organization.cin}</strong></article>
            <article><ShieldCheck /><span>DARPAN ID</span><strong>{organization.darpanId}</strong></article>
            <article><BadgeCheck /><span>Date of incorporation</span><strong>{organization.incorporationDate}</strong></article>
          </div>
          <div className="verification-note"><strong>Important:</strong> The foundation does not currently publish an ISO certification or 80G tax-exemption claim on this website unless and until a final, valid approval is independently verified.</div>
        </div>
      </section>

      <section className="compact-cta">
        <div className="container compact-cta__inner">
          <div><p className="eyebrow eyebrow--light">Be part of the mission</p><h2>Compassion becomes change when people act together.</h2></div>
          <div><Link className="button button--gold button--large" href="/donate">Support our mission</Link><Link className="button button--outline-light button--large" href="/contact">Talk to us</Link></div>
        </div>
      </section>
    </>
  );
}
