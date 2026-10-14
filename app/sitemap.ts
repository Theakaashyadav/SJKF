import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/about", "/our-work", "/gallery", "/documents", "/donate", "/contact", "/privacy-policy", "/terms", "/donation-policy", "/refund-policy"];
  return routes.map((route) => ({ url: `${SITE_URL}${route}`, lastModified: new Date(route === "/documents" ? "2026-10-14" : "2026-10-03"), changeFrequency: route === "" ? "weekly" : "monthly", priority: route === "" ? 1 : ["/donate", "/our-work"].includes(route) ? 0.9 : 0.7 }));
}
