import { HandHeart } from "lucide-react";
import Link from "next/link";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className={`brand ${light ? "brand--light" : ""}`} aria-label="Swabhiman Foundation home">
      <span className="brand__mark" aria-hidden="true">
        <HandHeart strokeWidth={1.7} />
      </span>
      <span className="brand__text">
        <strong>SWABHIMAN</strong>
        <span>Jan Evam Pashu Kalyan Foundation</span>
      </span>
    </Link>
  );
}
