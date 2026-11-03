import { T } from "@/components/LanguageProvider";
import Link from "next/link";

export default function NotFound() {
  return <section className="transaction-page"><div className="transaction-card"><p className="eyebrow"><T>{"Page not found"}</T></p><h1><T>{"This page doesn’t exist."}</T></h1><p><T>{"The address may have changed, or the page may no longer be available."}</T></p><Link className="button button--green" href="/"><T>{"Return home"}</T></Link></div></section>;
}
