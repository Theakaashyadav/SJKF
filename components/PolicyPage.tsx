import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";

export type PolicySection = { id: string; title: string; content: React.ReactNode };

export function PolicyPage({ title, summary, sections, updated = "3 October 2026" }: { title: string; summary: string; sections: PolicySection[]; updated?: string }) {
  return (
    <>
      <section className="policy-hero"><div className="container"><div className="policy-breadcrumb"><Link href="/">Home</Link><ChevronRight /><span>Policies</span></div><FileText /><h1>{title}</h1><p>{summary}</p><span>Last updated: {updated}</span></div></section>
      <section className="section policy-section">
        <div className="container policy-layout">
          <aside><strong>On this page</strong><nav>{sections.map((section) => <a key={section.id} href={`#${section.id}`}>{section.title}</a>)}</nav></aside>
          <article className="policy-content">
            {sections.map((section) => <section id={section.id} key={section.id}><h2>{section.title}</h2>{section.content}</section>)}
            <div className="policy-contact"><h2>Questions about this policy?</h2><p>Use the contact form and choose the most relevant enquiry type. Please do not include banking passwords, OTPs, CVVs or full card details.</p><Link className="button button--green" href="/contact">Contact the foundation</Link></div>
          </article>
        </div>
      </section>
    </>
  );
}
