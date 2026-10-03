import type { Metadata } from "next";
import { organization } from "@/lib/site";

export function buildPageMetadata(title: string, description: string, path: string): Metadata {
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "en_IN",
      siteName: organization.shortName,
      title,
      description,
      url: path,
    },
    twitter: { card: "summary", title, description },
  };
}
