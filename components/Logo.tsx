import Image from "next/image";
import Link from "next/link";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className={`brand ${light ? "brand--light" : ""}`} aria-label="Swabhiman Foundation home">
      <Image className="brand__image" src="/images/logo.png" alt="Swabhiman Jan Evam Pashu Kalyan Foundation" width={2172} height={724} priority={!light} />
    </Link>
  );
}
