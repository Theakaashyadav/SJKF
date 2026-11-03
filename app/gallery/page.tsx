import { T } from "@/components/LanguageProvider";
import type { Metadata } from "next";
import Link from "next/link";
import { Camera } from "lucide-react";
import { GalleryGrid } from "@/components/GalleryGrid";
import { PageHero } from "@/components/PageHero";
import { SectionHeading } from "@/components/SectionHeading";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata("Gallery & Impact | Swabhiman Foundation", "Explore photographs of animal care, community gatherings and shared moments from Swabhiman Foundation's gallery.", "/gallery");

export default function GalleryPage() {
  return (
    <>
      <PageHero eyebrow="Gallery & impact" title="Stories of Compassion & Change" description="Animal care, community gatherings and shared moments from our photo collection." image="/images/gallery/community-gathering.jpeg" />
      <section className="section">
        <div className="container">
          <div className="gallery-intro">
            <SectionHeading eyebrow="Our photo gallery" title="Moments of Care & Community" description="Browse our photographs of cattle care, community conversations and learning. Select any photo to see it in full." />
            <div className="gallery-trust"><Camera /><p><strong><T>{"From our photo collection"}</T></strong><span><T>{"Explore the gallery by category or open a photo for a closer look."}</T></span></p></div>
          </div>
          <GalleryGrid />
        </div>
      </section>
      <section className="media-callout">
        <div className="container media-callout__inner"><Camera /><div><h2><T>{"Help us document work with dignity."}</T></h2><p><T>{"Project media should be consented, accurately captioned and respectful of the people and animals shown."}</T></p></div><Link className="button button--gold" href="/contact"><T>{"Contact the foundation"}</T></Link></div>
      </section>
    </>
  );
}
