import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { navLinks, organization, socialLinks } from "@/lib/site";
import { T } from "@/components/LanguageProvider";

const policyLinks = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/refund-policy", label: "Refund / Cancellation Policy" },
  { href: "/donation-policy", label: "Donation Policy" },
];

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-about">
          <Logo light />
          <p>
            <T>A Section 8 non-profit working toward compassionate, sustainable support for people, animals and communities.</T>
          </p>
          <div className="social-links" aria-label="Social media links">
            {socialLinks.length ? socialLinks.map((item) => <a key={item.label} href={item.href} target="_blank" rel="noreferrer" aria-label={item.label}><b aria-hidden="true">{item.short}</b></a>) : <p className="social-note"><T>Official social profiles will be added after verification.</T></p>}
          </div>
        </div>
        <div>
          <h2 className="footer-heading"><T>Quick links</T></h2>
          <ul className="footer-links">
            {navLinks.map((link) => <li key={link.href}><Link href={link.href}><T>{link.label}</T></Link></li>)}
          </ul>
        </div>
        <div>
          <h2 className="footer-heading"><T>Important links</T></h2>
          <ul className="footer-links">
            {policyLinks.map((link) => <li key={link.href}><Link href={link.href}><T>{link.label}</T></Link></li>)}
          </ul>
        </div>
        <div>
          <h2 className="footer-heading"><T>Registered office</T></h2>
          <ul className="footer-contact">
            <li><MapPin aria-hidden="true" /><span>{organization.addressLines.map((line, index) => <span key={line}>{index > 0 ? ", " : ""}<T>{line}</T></span>)}</span></li>
            <li><Mail aria-hidden="true" /><a href={`mailto:${organization.email}`}>{organization.email}</a></li>
            <li><Phone aria-hidden="true" /><a href={`tel:${organization.phone.replace(/[^\d+]/g, "")}`}>{organization.phone}</a></li>
          </ul>
        </div>
      </div>
      <div className="container footer-legal">
        <div><p>© {new Date().getFullYear()} <T>Swabhiman Jan Evam Pashu Kalyan Foundation</T>. <T>All Rights Reserved.</T></p><p className="footer-photo-note"><T>Representative stock photography is not presented as evidence of completed foundation projects.</T></p></div>
        <p>CIN: {organization.cin} · DARPAN ID: {organization.darpanId}</p>
      </div>
    </footer>
  );
}
