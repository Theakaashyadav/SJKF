import { T } from "@/components/LanguageProvider";

export function SectionHeading({
  eyebrow,
  title,
  description,
  centered = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  centered?: boolean;
}) {
  return (
    <div className={`section-heading ${centered ? "section-heading--center" : ""}`}>
      <p className="eyebrow"><T>{eyebrow}</T></p>
      <h2><T>{title}</T></h2>
      {description ? <p><T>{description}</T></p> : null}
    </div>
  );
}
