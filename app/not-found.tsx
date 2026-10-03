import Link from "next/link";

export default function NotFound() {
  return <section className="transaction-page"><div className="transaction-card"><p className="eyebrow">Page not found</p><h1>This page doesn’t exist.</h1><p>The address may have changed, or the page may no longer be available.</p><Link className="button button--green" href="/">Return home</Link></div></section>;
}
