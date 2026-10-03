"use client";

import Image from "next/image";
import { Calendar, Expand, MapPin, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const filters = ["All", "Animal Welfare", "Education", "Healthcare", "Environment", "Community"] as const;

const items = [
  { id: 1, category: "Animal Welfare", title: "Animal Welfare Media Placeholder", image: "/images/animal-welfare.jpg", location: "Representative stock image · Kolkata", date: "Project date awaiting verification", description: "Reserved for verified photographs of rescue, feeding, veterinary care or animal protection initiatives." },
  { id: 2, category: "Community", title: "Community Development Media Placeholder", image: "/images/community-support.jpg", location: "Representative stock image · India", date: "Project date awaiting verification", description: "Reserved for verified community development, livelihood or outreach documentation." },
  { id: 3, category: "Education", title: "Education Media Placeholder", image: "/images/hero-community.jpg", location: "Representative stock image · Howrah", date: "Project date awaiting verification", description: "Reserved for verified photographs of education, learning-material or literacy initiatives." },
  { id: 4, category: "Healthcare", title: "Healthcare Media Placeholder", image: "/images/community-support.jpg", location: "Representative stock image · India", date: "Project date awaiting verification", description: "Reserved for verified documentation from a medical camp, awareness activity or healthcare partnership." },
  { id: 5, category: "Environment", title: "Environment Media Placeholder", image: "/images/hero-community.jpg", location: "Representative stock image · India", date: "Project date awaiting verification", description: "Reserved for verified photographs of plantation, cleanliness or environmental awareness initiatives." },
  { id: 6, category: "Animal Welfare", title: "Rescue & Care Media Placeholder", image: "/images/animal-welfare.jpg", location: "Representative stock image · Kolkata", date: "Project date awaiting verification", description: "Reserved for verified photographs and context from an animal care or rehabilitation activity." },
] as const;

export function GalleryGrid() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [selected, setSelected] = useState<(typeof items)[number] | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const filtered = useMemo(() => filter === "All" ? items : items.filter((item) => item.category === filter), [filter]);

  useEffect(() => {
    if (!selected) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const close = (event: KeyboardEvent) => event.key === "Escape" && setSelected(null);
    document.addEventListener("keydown", close);
    document.body.style.overflow = selected ? "hidden" : "";
    return () => {
      document.removeEventListener("keydown", close);
      document.body.style.overflow = "";
      previousFocusRef.current?.focus();
    };
  }, [selected]);

  return (
    <>
      <div className="gallery-filters" role="group" aria-label="Filter gallery">
        {filters.map((item) => <button type="button" key={item} onClick={() => setFilter(item)} className={filter === item ? "is-active" : ""} aria-pressed={filter === item}>{item}</button>)}
      </div>
      <div className="gallery-grid" aria-live="polite">
        {filtered.map((item, index) => (
          <button type="button" className={`gallery-card gallery-card--${(index % 3) + 1}`} key={item.id} onClick={() => setSelected(item)} aria-label={`Open ${item.title}`}>
            <Image src={item.image} alt="" fill sizes="(max-width: 700px) 100vw, (max-width: 1000px) 50vw, 33vw" />
            <span className="gallery-card__tag">{item.category}</span>
            <span className="gallery-card__placeholder">Development placeholder</span>
            <span className="gallery-card__content"><strong>{item.title}</strong><span>View details <Expand /></span></span>
          </button>
        ))}
      </div>

      {selected ? (
        <div className="lightbox" role="dialog" aria-modal="true" aria-labelledby="lightbox-title" onMouseDown={(event) => event.currentTarget === event.target && setSelected(null)} onKeyDown={(event) => { if (event.key === "Tab") { event.preventDefault(); closeButtonRef.current?.focus(); } }}>
          <div className="lightbox__panel">
            <button ref={closeButtonRef} className="lightbox__close" type="button" onClick={() => setSelected(null)} aria-label="Close gallery item"><X /></button>
            <div className="lightbox__image"><Image src={selected.image} alt="Representative stock photography for future project documentation" fill sizes="90vw" /></div>
            <div className="lightbox__body">
              <span className="gallery-card__tag">{selected.category}</span>
              <h2 id="lightbox-title">{selected.title}</h2>
              <p>{selected.description}</p>
              <div className="lightbox__meta"><span><MapPin />{selected.location}</span><span><Calendar />{selected.date}</span></div>
              <div className="disclosure-box"><strong>Transparency note:</strong> This licensed stock photograph is a visual placeholder and is not presented as a Swabhiman Foundation activity. It will be replaced only with verified, consented project media.</div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
