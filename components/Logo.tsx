"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

export function Logo({ light = false }: { light?: boolean }) {
  const { t } = useLanguage();
  return (
    <Link href="/" className={`brand ${light ? "brand--light" : ""}`} aria-label={t("Swabhiman Foundation home")}>
      <Image className="brand__image" src="/images/logo.png" alt={t("Swabhiman Jan Evam Pashu Kalyan Foundation")} width={2172} height={724} priority={!light} />
    </Link>
  );
}
