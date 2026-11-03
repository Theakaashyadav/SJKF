import Image from "next/image";
import { T } from "@/components/LanguageProvider";

export function PageHero({
  eyebrow,
  title,
  description,
  image,
}: {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
}) {
  return (
    <section className="page-hero">
      <Image src={image} alt="" fill priority sizes="100vw" className="page-hero__image" />
      <div className="page-hero__veil" />
      <div className="container page-hero__content">
        <p className="eyebrow eyebrow--light"><T>{eyebrow}</T></p>
        <h1><T>{title}</T></h1>
        <p><T>{description}</T></p>
      </div>
    </section>
  );
}
