import type { Metadata } from "next";
import { DocumentsLibrary } from "@/components/DocumentsLibrary";
import { PageHero } from "@/components/PageHero";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata(
  "Documents | Swabhiman Foundation",
  "View and download Swabhiman Foundation's registration documents, Section 8 licence and governance records.",
  "/documents",
);

export default function DocumentsPage() {
  return (
    <>
      <PageHero
        eyebrow="Transparency & trust"
        title="Our Documents"
        description="Explore our registration and governance records. Select a PDF to view it here, open it in a new tab or download a copy."
      />
      <section className="section section--soft documents-section" aria-label="Foundation documents">
        <div className="container">
          <DocumentsLibrary />
        </div>
      </section>
    </>
  );
}
