import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Check, HeartHandshake } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { SectionHeading } from "@/components/SectionHeading";
import { workAreas } from "@/lib/site";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata("Our Work | Animal Welfare & Community Development NGO", "Explore our objectives across animal welfare, education, healthcare, the environment, women and youth development, community welfare and disaster relief.", "/our-work");

export default function OurWorkPage() {
  return (
    <>
      <PageHero eyebrow="Our work" title="Creating Meaningful Change Where It Matters Most" description="Our work is designed around responsible action, local participation and care that respects the dignity of every life." image="/images/community-support.jpg" />
      <section className="section work-intro">
        <div className="container work-intro__inner">
          <SectionHeading eyebrow="Connected priorities" title="One Mission, Many Paths to Change" description="Each focus area is part of a wider commitment to resilient communities. As a growing organization, we describe what we aim to do—not achievements that have not yet been evidenced." />
          <div className="principle-card"><HeartHandshake /><p><strong>Our working principle</strong><span>Listen carefully. Plan responsibly. Partner transparently. Act with compassion.</span></p></div>
        </div>
      </section>

      <div className="work-list">
        {workAreas.map((area, index) => {
          const Icon = area.icon;
          return (
            <section className={`work-section ${index % 2 ? "work-section--reverse" : ""}`} id={area.slug} key={area.slug}>
              <div className="container work-section__grid">
                <div className="work-section__media">
                  <Image src={area.image} alt="Representative Indian community context for this area of work" fill sizes="(max-width: 900px) 100vw, 50vw" />
                  <span>Representative photography · Project media to be added after verification</span>
                </div>
                <div className="work-section__content">
                  <div className="work-section__number">{area.number}</div>
                  <span className="work-section__icon"><Icon /></span>
                  <h2>{area.title}</h2>
                  <p className="work-section__summary">{area.summary}</p>
                  <h3>What we aim to do</h3>
                  <p>{area.aim}</p>
                  <ul>
                    {area.activities.map((activity) => <li key={activity}><Check />{activity}</li>)}
                  </ul>
                  <Link className="button button--green" href={`/donate?cause=${encodeURIComponent(area.title)}`}>Support this cause</Link>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <section className="compact-cta">
        <div className="container compact-cta__inner">
          <div><p className="eyebrow eyebrow--light">Create change together</p><h2>Choose the cause closest to your heart.</h2></div>
          <div><Link className="button button--gold button--large" href="/donate">Donate now</Link><Link className="button button--outline-light button--large" href="/contact">Partner with us</Link></div>
        </div>
      </section>
    </>
  );
}
