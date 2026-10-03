import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { organization, SITE_URL } from "@/lib/site";
import "@fontsource-variable/manrope";
import "@fontsource/dm-serif-display/400.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Swabhiman Jan Evam Pashu Kalyan Foundation | NGO in Uttar Pradesh",
    template: "%s | Swabhiman Foundation",
  },
  description: "A registered Section 8 non-profit serving people, animals and communities through welfare, education, healthcare and environmental initiatives.",
  applicationName: organization.shortName,
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: organization.shortName,
    title: "Swabhiman Jan Evam Pashu Kalyan Foundation",
    description: organization.tagline,
  },
  twitter: {
    card: "summary",
    title: "Swabhiman Jan Evam Pashu Kalyan Foundation",
    description: organization.tagline,
  },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "NGO",
    name: organization.name,
    url: SITE_URL,
    slogan: organization.tagline,
    identifier: [
      { "@type": "PropertyValue", name: "CIN", value: organization.cin },
      { "@type": "PropertyValue", name: "NGO DARPAN ID", value: organization.darpanId },
    ],
    foundingDate: "2026-06-20",
    address: {
      "@type": "PostalAddress",
      streetAddress: "House No. 432, Ranhera, Jewer",
      addressLocality: "Gautam Buddha Nagar",
      addressRegion: "Uttar Pradesh",
      postalCode: "203155",
      addressCountry: "IN",
    },
  };

  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <Header />
        <main id="main-content">{children}</main>
        <Footer />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      </body>
    </html>
  );
}
