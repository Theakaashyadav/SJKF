import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, ShieldCheck, Sparkles } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { SectionHeading } from "@/components/SectionHeading";
import { organization } from "@/lib/site";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata("About Us | Swabhiman Jan Evam Pashu Kalyan Foundation", "Learn about Swabhiman Foundation's purpose, story, leadership and verified registration details.", "/about");

const members = [
  { name: "Naresh Kumar Sharma", designation: "Patron (संरक्षक)", image: "naresh-kumar-sharma.jpeg" },
  { name: "Sonu Sharma", designation: "Founder & President", image: "sonu-sharma.jpeg" },
  { name: "Kamal Sharma", designation: "Vice President", image: "kamal-sharma.jpeg" },
  { name: "Kulbhan Singh", designation: "Vice President", image: "kulbhan-singh.jpeg" },
  { name: "Sagar Bhardwaj", designation: "Secretary", image: "sagar-bhardwaj.jpeg" },
  { name: "S k Bhardwaj", designation: "Executive Member", image: "s-k-bhardwaj.jpeg" },
  { name: "Santosh Yadav", designation: "Executive Member", image: "santosh-yadav.jpeg" },
  { name: "Neera Sharma", designation: "Joint Secretary", image: "neera-sharma.jpeg" },
  { name: "Ramakant", designation: null, image: "ramakant.jpeg" },
  { name: "NARESH JI MAHARAJ", designation: "Spokesperson", image: "naresh-ji-maharaj.jpeg" },
];

export default function AboutPage() {
  return (
    <>
      <PageHero eyebrow="About us" title="About Swabhiman Foundation" description="Compassion, responsibility and sustainable change—brought together through service." image="/images/stock/about-teamwork.jpg" />

      <section className="section">
        <div className="container story-grid">
          <div className="story-media">
            <Image src="/images/stock/about-rural-life.jpg" alt="An older woman sitting beside cattle outside a village home in Maharashtra" fill sizes="(max-width: 850px) 100vw, 45vw" />
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

      <section className="section section--soft">
        <div className="container">
          <SectionHeading eyebrow="The people behind our purpose" title="Meet Our Team" description="United by compassion and a shared commitment to serving people, protecting animals and strengthening communities." centered />
          <div className="team-list">
            {members.map((member, index) => (
              <article className="team-member" key={member.name} aria-labelledby={`member-${index}`}>
                <div className="team-member__portrait">
                  {member.image ? (
                    <Image src={`/images/team/${member.image}`} alt={`Portrait of ${member.name}`} fill sizes="(max-width: 700px) 85vw, 340px" />
                  ) : (
                    <div className="team-member__placeholder" role="img" aria-label={`Photo of ${member.name} coming soon`}>
                      <span aria-hidden="true">{member.name.split(" ").map((part) => part[0]).join("")}</span>
                      <small>Photo coming soon</small>
                    </div>
                  )}
                </div>
                <div className="team-member__details">
                  <span className="team-member__number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <h3 id={`member-${index}`}>{member.name}</h3>
                  {member.designation && <p className="team-member__designation">{member.designation}</p>}
                  <span className="team-member__rule" aria-hidden="true" />
                  <p className="team-member__foundation">Swabhiman Jan Evam Pashu Kalyan Foundation</p>
                </div>
              </article>
            ))}
          </div>
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
          <div className="verification-note">View our registration records, governance documents and ISO 9001 document in the <Link href="/documents">document library</Link>.</div>
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
