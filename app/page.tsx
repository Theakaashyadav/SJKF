import { T } from "@/components/LanguageProvider";
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
import { GalleryGrid } from "@/components/GalleryGrid";
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
          <div className="trust-pill"><BadgeCheck /><T>{" Registered Section 8 Non-Profit Organization"}</T></div>
          <h1><T>{"Compassion in Action."}</T><br /><span><T>{"Change That Reaches Every Life."}</T></span></h1>
          <p><T>{"Working for meaningful and sustainable change through animal welfare, education, healthcare, environmental protection and community development."}</T></p>
          <div className="hero-actions">
            <Link className="button button--gold button--large" href="/donate"><T>{"Donate now"}</T></Link>
            <Link className="button button--outline-light button--large" href="/our-work"><T>{"Explore our work"}</T></Link>
          </div>
        </div>
        <div className="hero-proof">
          <div className="container hero-proof__inner">
            <p><strong><T>{"Uttar Pradesh"}</T></strong><span><T>{"Registered state"}</T></span></p>
            <p><strong><T>{"People & animals"}</T></strong><span><T>{"One compassionate mission"}</T></span></p>
            <p><strong><T>{"Transparent by design"}</T></strong><span><T>{"Public registration details"}</T></span></p>
          </div>
        </div>
      </section>

      <section className="section section--soft home-gallery" aria-label="Photo gallery">
        <div className="container">
          <SectionHeading eyebrow="Our photo gallery" title="Moments of Care & Community" description="Explore photographs of animal care, community gatherings and learning. Select any photo for a closer look." centered />
          <GalleryGrid preview />
          <div className="home-gallery__actions">
            <Link className="button button--green" href="/gallery"><T>{"View full gallery "}</T><ArrowRight /></Link>
          </div>
        </div>
      </section>

      <section className="section section--intro">
        <div className="container intro-grid">
          <div>
            <SectionHeading eyebrow="Who we are" title="Working Together for a More Compassionate Society" />
            <Link className="text-link" href="/about"><T>{"Learn more about us "}</T><ArrowRight /></Link>
          </div>
          <div className="intro-copy">
            <p className="lead"><T>{"Swabhiman Foundation is founded on a simple belief: dignity and care should reach every life."}</T></p>
            <p><T>{"We bring people together around animal welfare, accessible education, healthcare awareness, environmental responsibility and the upliftment of vulnerable communities."}</T></p>
            <p><T>{"Our approach is grounded in service, transparency and responsible collaboration—building initiatives that communities can trust and sustain."}</T></p>
            <div className="mini-values" aria-label="Our commitments">
              <span><Check /><T>{" Compassion"}</T></span><span><Check /><T>{" Integrity"}</T></span><span><Check /><T>{" Service"}</T></span>
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
                    <Image src={area.image} alt={area.alt} style={{ objectPosition: "imagePosition" in area ? area.imagePosition : undefined }} fill sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 33vw" />
                  </div>
                  <div className="cause-card__body">
                    <span className="cause-card__icon"><Icon /></span>
                    <h3><T>{area.title}</T></h3>
                    <p><T>{area.description}</T></p>
                    <Link href={`/our-work#${area.slug}`} aria-label={`Learn more about ${area.title}`}><T>{"Learn more"}</T><ArrowRight />
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
            <Image src="/images/stock/animal-care-feature.jpg" alt="A volunteer providing food to rescued dogs at an animal shelter" fill sizes="(max-width: 900px) 100vw, 50vw" />
            <div className="feature-split__note"><HandHeart /><span><T>{"Care that protects dignity and wellbeing"}</T></span></div>
          </div>
          <div className="feature-split__content">
            <p className="eyebrow"><T>{"Animal welfare"}</T></p>
            <h2><T>{"Giving a Voice to Those Who Cannot Ask for Help"}</T></h2>
            <p><T>{"Our animal welfare objectives include rescue support, treatment, feeding, vaccination, sterilization awareness, rehabilitation and shelter partnerships."}</T></p>
            <p><T>{"We aim to encourage humane communities where stray animals, cattle and other vulnerable animals receive responsible care and protection."}</T></p>
            <Link className="button button--green" href="/donate?cause=Animal%20Welfare"><T>{"Support animal welfare"}</T></Link>
          </div>
        </div>
      </section>

      <section className="section impact-section">
        <div className="container impact-grid">
          <div>
            <p className="eyebrow eyebrow--light"><T>{"Community impact"}</T></p>
            <h2><T>{"Creating Change, One Community at a Time"}</T></h2>
            <p><T>{"We measure meaningful progress through responsible action, community trust and the strength of the systems we help build—not through unverified claims."}</T></p>
          </div>
          <div className="impact-list">
            {impactAreas.map((item, index) => (
              <div key={item}><span>0{index + 1}</span><p><T>{item}</T></p><Check /></div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading eyebrow="Take part" title="How You Can Help" description="Every person has something valuable to contribute—resources, time, expertise or a shared commitment to serve." centered />
          <div className="help-grid">
            <article><span><HandHeart /></span><h3><T>{"Donate"}</T></h3><p><T>{"Your support helps strengthen carefully planned welfare initiatives."}</T></p><Link href="/donate"><T>{"Make a contribution "}</T><ArrowRight /></Link></article>
            <article><span><Users /></span><h3><T>{"Volunteer"}</T></h3><p><T>{"Contribute your skills, time and energy to meaningful community action."}</T></p><Link href="/contact?interest=volunteer"><T>{"Volunteer with us "}</T><ArrowRight /></Link></article>
            <article><span><HeartHandshake /></span><h3><T>{"Partner with us"}</T></h3><p><T>{"Collaborate through CSR, institutional expertise or responsible local partnerships."}</T></p><Link href="/contact?interest=partnership"><T>{"Start a conversation "}</T><ArrowRight /></Link></article>
          </div>
        </div>
      </section>

      <section className="section section--soft trust-section">
        <div className="container trust-layout">
          <div>
            <SectionHeading eyebrow="Accountability" title="Committed to Transparency" description="Our legal identity is displayed clearly so supporters can make informed decisions with confidence." />
            <p className="trust-note"><ShieldCheck /><T>{" No tax-exemption or certification claim is made without a verified, applicable approval."}</T></p>
          </div>
          <div className="trust-cards">
            <article><Building2 /><span><T>{"Legal structure"}</T></span><strong><T>{"Section 8 Company"}</T></strong></article>
            <article><BadgeCheck /><span><T>{"Corporate Identity Number"}</T></span><strong>{organization.cin}</strong></article>
            <article><ShieldCheck /><span><T>{"NGO DARPAN Registration"}</T></span><strong>{organization.darpanId}</strong></article>
            <article><BadgeCheck /><span><T>{"Incorporated"}</T></span><strong><T>{organization.incorporationDate}</T></strong></article>
          </div>
        </div>
      </section>

      <section className="donation-cta">
        <Image src="/images/stock/home-donation.jpg" alt="" fill sizes="100vw" />
        <div className="donation-cta__overlay" />
        <div className="container donation-cta__content">
          <span className="donation-cta__icon"><HandHeart /></span>
          <h2><T>{"Your Contribution Can Create a Lasting Impact."}</T></h2>
          <p><T>{"Every contribution helps strengthen initiatives for people, animals and communities in need."}</T></p>
          <Link className="button button--gold button--large" href="/donate"><T>{"Donate now"}</T></Link>
        </div>
      </section>
    </>
  );
}
