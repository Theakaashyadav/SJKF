import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { navLinks, organization, socialLinks } from "@/lib/site";

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
            A Section 8 non-profit working toward compassionate, sustainable support for people, animals and communities.
          </p>
          <div className="social-links" aria-label="Social media links">
            {socialLinks.length ? socialLinks.map((item) => <a key={item.label} href={item.href} target="_blank" rel="noreferrer" aria-label={item.label}><b aria-hidden="true">{item.short}</b></a>) : <p className="social-note">Official social profiles will be added after verification.</p>}
          </div>
        </div>
        <div>
          <h2 className="footer-heading">Quick links</h2>
          <ul className="footer-links">
            {navLinks.map((link) => <li key={link.href}><Link href={link.href}>{link.label}</Link></li>)}
          </ul>
        </div>
        <div>
          <h2 className="footer-heading">Important links</h2>
          <ul className="footer-links">
            {policyLinks.map((link) => <li key={link.href}><Link href={link.href}>{link.label}</Link></li>)}
          </ul>
        </div>
        <div>
          <h2 className="footer-heading">Registered office</h2>
          <ul className="footer-contact">
            <li><MapPin aria-hidden="true" /><span>{organization.addressLines.join(", ")}</span></li>
            <li><Mail aria-hidden="true" /><span>{organization.email || "Official email to be published"}</span></li>
            <li><Phone aria-hidden="true" /><span>{organization.phone || "Official phone number to be published"}</span></li>
          </ul>
        </div>
      </div>
      <div className="container footer-legal">
        <div><p>© {new Date().getFullYear()} Swabhiman Jan Evam Pashu Kalyan Foundation. All Rights Reserved.</p><p className="footer-photo-note">Representative stock photography is not presented as evidence of completed foundation projects.</p></div>
        <p>CIN: {organization.cin} · DARPAN ID: {organization.darpanId}</p>
      </div>
    </footer>
  );
}
