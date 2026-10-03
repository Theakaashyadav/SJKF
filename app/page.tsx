import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  HandHeart,
  HeartHandshake,
  ShieldCheck,
  Users,
} from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { focusAreas, organization } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Swabhiman Jan Evam Pashu Kalyan Foundation | NGO in Uttar Pradesh" },
  description: "Support a registered Section 8 NGO working for animal welfare, education, healthcare, the environment and community development in Uttar Pradesh.",
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "en_IN", siteName: organization.shortName, title: "Swabhiman Jan Evam Pashu Kalyan Foundation | NGO in Uttar Pradesh", description: "Support a registered Section 8 NGO working for animal welfare, education, healthcare, the environment and community development in Uttar Pradesh.", url: "/" },
  twitter: { card: "summary", title: "Swabhiman Jan Evam Pashu Kalyan Foundation", description: organization.tagline },
};

const impactAreas = ["Animal welfare", "Education support", "Healthcare access", "Environmental initiatives", "Community development"];

export default function HomePage() {
  return (
    <>
      <section className="home-hero">
        <Image
          src="/images/hero-community.jpg"
          alt="Smiling children and adults gathered with a street dog in an Indian neighbourhood"
          fill
          priority
          sizes="100vw"
          className="home-hero__image"
        />
        <div className="home-hero__overlay" />
        <div className="home-hero__accent" aria-hidden="true" />
        <div className="container home-hero__content">
          <div className="trust-pill"><BadgeCheck /> Registered Section 8 Non-Profit Organization</div>
          <h1>Compassion in Action.<br /><span>Change That Reaches Every Life.</span></h1>
          <p>Working for meaningful and sustainable change through animal welfare, education, healthcare, environmental protection and community development.</p>
          <div className="hero-actions">
            <Link className="button button--gold button--large" href="/donate">Donate now</Link>
            <Link className="button button--outline-light button--large" href="/our-work">Explore our work</Link>
          </div>
        </div>
        <div className="hero-proof">
          <div className="container hero-proof__inner">
            <p><strong>Uttar Pradesh</strong><span>Registered state</span></p>
            <p><strong>People & animals</strong><span>One compassionate mission</span></p>
            <p><strong>Transparent by design</strong><span>Public registration details</span></p>
          </div>
        </div>
      </section>

      <section className="section section--intro">
        <div className="container intro-grid">
          <div>
            <SectionHeading eyebrow="Who we are" title="Working Together for a More Compassionate Society" />
            <Link className="text-link" href="/about">Learn more about us <ArrowRight /></Link>
          </div>
          <div className="intro-copy">
            <p className="lead">Swabhiman Foundation is founded on a simple belief: dignity and care should reach every life.</p>
            <p>We bring people together around animal welfare, accessible education, healthcare awareness, environmental responsibility and the upliftment of vulnerable communities.</p>
            <p>Our approach is grounded in service, transparency and responsible collaboration—building initiatives that communities can trust and sustain.</p>
            <div className="mini-values" aria-label="Our commitments">
              <span><Check /> Compassion</span><span><Check /> Integrity</span><span><Check /> Service</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--soft">
        <div className="container">
          <SectionHeading eyebrow="Our causes" title="Our Focus Areas" description="Connected challenges need thoughtful, connected action. Our focus areas bring care and opportunity closer to communities." centered />
          <div className="cause-grid">
            {focusAreas.map((area) => {
              const Icon = area.icon;
              return (
                <article className="cause-card" key={area.title}>
                  <div className="cause-card__image">
                    <Image src={area.image} alt={area.alt} fill sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 33vw" />
                  </div>
                  <div className="cause-card__body">
                    <span className="cause-card__icon"><Icon /></span>
                    <h3>{area.title}</h3>
                    <p>{area.description}</p>
                    <Link href={`/our-work#${area.slug}`} aria-label={`Learn more about ${area.title}`}>
                      Learn more <ArrowRight />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section feature-split">
        <div className="container feature-split__grid">
          <div className="feature-split__media">
            <Image src="/images/animal-welfare.jpg" alt="Street dogs eating near Howrah Bridge in Kolkata" fill sizes="(max-width: 900px) 100vw, 50vw" />
            <div className="feature-split__note"><HandHeart /><span>Care that protects dignity and wellbeing</span></div>
          </div>
          <div className="feature-split__content">
            <p className="eyebrow">Animal welfare</p>
            <h2>Giving a Voice to Those Who Cannot Ask for Help</h2>
            <p>Our animal welfare objectives include rescue support, treatment, feeding, vaccination, sterilization awareness, rehabilitation and shelter partnerships.</p>
            <p>We aim to encourage humane communities where stray animals, cattle and other vulnerable animals receive responsible care and protection.</p>
            <Link className="button button--green" href="/donate?cause=Animal%20Welfare">Support animal welfare</Link>
          </div>
        </div>
      </section>

      <section className="section impact-section">
        <div className="container impact-grid">
          <div>
            <p className="eyebrow eyebrow--light">Community impact</p>
            <h2>Creating Change, One Community at a Time</h2>
            <p>We measure meaningful progress through responsible action, community trust and the strength of the systems we help build—not through unverified claims.</p>
          </div>
          <div className="impact-list">
            {impactAreas.map((item, index) => (
              <div key={item}><span>0{index + 1}</span><p>{item}</p><Check /></div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading eyebrow="Take part" title="How You Can Help" description="Every person has something valuable to contribute—resources, time, expertise or a shared commitment to serve." centered />
          <div className="help-grid">
            <article><span><HandHeart /></span><h3>Donate</h3><p>Your support helps strengthen carefully planned welfare initiatives.</p><Link href="/donate">Make a contribution <ArrowRight /></Link></article>
            <article><span><Users /></span><h3>Volunteer</h3><p>Contribute your skills, time and energy to meaningful community action.</p><Link href="/contact?interest=volunteer">Volunteer with us <ArrowRight /></Link></article>
            <article><span><HeartHandshake /></span><h3>Partner with us</h3><p>Collaborate through CSR, institutional expertise or responsible local partnerships.</p><Link href="/contact?interest=partnership">Start a conversation <ArrowRight /></Link></article>
          </div>
        </div>
      </section>

      <section className="section section--soft trust-section">
        <div className="container trust-layout">
          <div>
            <SectionHeading eyebrow="Accountability" title="Committed to Transparency" description="Our legal identity is displayed clearly so supporters can make informed decisions with confidence." />
            <p className="trust-note"><ShieldCheck /> No tax-exemption or certification claim is made without a verified, applicable approval.</p>
          </div>
          <div className="trust-cards">
            <article><Building2 /><span>Legal structure</span><strong>Section 8 Company</strong></article>
            <article><BadgeCheck /><span>Corporate Identity Number</span><strong>{organization.cin}</strong></article>
            <article><ShieldCheck /><span>NGO DARPAN Registration</span><strong>{organization.darpanId}</strong></article>
            <article><BadgeCheck /><span>Incorporated</span><strong>{organization.incorporationDate}</strong></article>
          </div>
        </div>
      </section>

      <section className="donation-cta">
        <Image src="/images/community-support.jpg" alt="" fill sizes="100vw" />
        <div className="donation-cta__overlay" />
        <div className="container donation-cta__content">
          <span className="donation-cta__icon"><HandHeart /></span>
          <h2>Your Contribution Can Create a Lasting Impact.</h2>
          <p>Every contribution helps strengthen initiatives for people, animals and communities in need.</p>
          <Link className="button button--gold button--large" href="/donate">Donate now</Link>
        </div>
      </section>
    </>
  );
}
