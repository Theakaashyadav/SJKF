import type { Metadata } from "next";
import Link from "next/link";
import { Camera, ShieldCheck } from "lucide-react";
import { GalleryGrid } from "@/components/GalleryGrid";
import { PageHero } from "@/components/PageHero";
import { SectionHeading } from "@/components/SectionHeading";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata("Gallery & Impact | Swabhiman Foundation", "A transparent gallery framework for verified stories, project photographs and community impact documentation from Swabhiman Foundation.", "/gallery");

export default function GalleryPage() {
  return (
    <>
      <PageHero eyebrow="Gallery & impact" title="Stories of Compassion & Change" description="A home for verified project moments, community stories and responsible impact documentation." image="/images/hero-community.jpg" />
      <section className="section">
        <div className="container">
          <div className="gallery-intro">
            <SectionHeading eyebrow="Impact, documented responsibly" title="A Gallery Built for Genuine Stories" description="Until verified photographs and project information are supplied, every development image is clearly marked as representative stock photography." />
            <div className="gallery-trust"><ShieldCheck /><p><strong>No invented project claims.</strong><span>Each future entry supports a title, location, date and short description.</span></p></div>
          </div>
          <GalleryGrid />
        </div>
      </section>
      <section className="media-callout">
        <div className="container media-callout__inner"><Camera /><div><h2>Help us document work with dignity.</h2><p>Project media should be consented, accurately captioned and respectful of the people and animals shown.</p></div><Link className="button button--gold" href="/contact">Contact the foundation</Link></div>
      </section>
    </>
  );
}
