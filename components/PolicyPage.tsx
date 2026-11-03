import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import { T } from "@/components/LanguageProvider";

export type PolicySection = { id: string; title: string; content: React.ReactNode };

export function PolicyPage({ title, summary, sections, updated = "3 October 2026" }: { title: string; summary: string; sections: PolicySection[]; updated?: string }) {
  return (
    <>
      <section className="policy-hero"><div className="container"><div className="policy-breadcrumb"><Link href="/"><T>Home</T></Link><ChevronRight /><span><T>Policies</T></span></div><FileText /><h1><T>{title}</T></h1><p><T>{summary}</T></p><span><T>Last updated:</T> <T>{updated}</T></span></div></section>
      <section className="section policy-section">
        <div className="container policy-layout">
          <aside><strong><T>On this page</T></strong><nav>{sections.map((section) => <a key={section.id} href={`#${section.id}`}><T>{section.title}</T></a>)}</nav></aside>
          <article className="policy-content">
            {sections.map((section) => <section id={section.id} key={section.id}><h2><T>{section.title}</T></h2>{section.content}</section>)}
            <div className="policy-contact"><h2><T>Questions about this policy?</T></h2><p><T>Use the contact form and choose the most relevant enquiry type. Please do not include banking passwords, OTPs, CVVs or full card details.</T></p><Link className="button button--green" href="/contact"><T>Contact the foundation</T></Link></div>
          </article>
        </div>
      </section>
    </>
  );
}
