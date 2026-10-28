"use client";

import Image from "next/image";
import { Expand, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const filters = ["All", "Animal Welfare", "Education", "Community"] as const;

const items = [
  { id: 1, category: "Animal Welfare", title: "Cattle Care at the Shelter", image: "/images/gallery/cattle-care.jpeg", alt: "People assisting with care for a cow inside a cattle shelter", description: "A moment of hands-on animal care at a cattle shelter, shared in the foundation's gallery." },
  { id: 2, category: "Animal Welfare", title: "Veterinary Care for Cattle", image: "/images/gallery/veterinary-care.jpeg", alt: "A group helping with the treatment of a cow at a cattle shelter", description: "People working together to support the treatment and care of cattle." },
  { id: 3, category: "Community", title: "Community Gathering", image: "/images/gallery/community-gathering.jpeg", alt: "People gathered for a discussion beneath the Swabhiman Foundation sign", description: "A community discussion at Swabhiman Jan Evam Pashu Kalyan Foundation." },
  { id: 5, category: "Education", title: "Learning & Discussion", image: "/images/gallery/learning-discussion.jpeg", alt: "Participants seated in a training room during a presentation", description: "Participants coming together for a presentation and discussion." },
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
            <Image src={item.image} alt={item.alt} fill sizes="(max-width: 700px) 100vw, (max-width: 1000px) 50vw, 33vw" />
            <span className="gallery-card__tag">{item.category}</span>
            <span className="gallery-card__content"><strong>{item.title}</strong><span>View details <Expand /></span></span>
          </button>
        ))}
      </div>

      {selected ? (
        <div className="lightbox" role="dialog" aria-modal="true" aria-labelledby="lightbox-title" onMouseDown={(event) => event.currentTarget === event.target && setSelected(null)} onKeyDown={(event) => { if (event.key === "Tab") { event.preventDefault(); closeButtonRef.current?.focus(); } }}>
          <div className="lightbox__panel">
            <button ref={closeButtonRef} className="lightbox__close" type="button" onClick={() => setSelected(null)} aria-label="Close gallery item"><X /></button>
            <div className="lightbox__image"><Image src={selected.image} alt={selected.alt} fill sizes="90vw" /></div>
            <div className="lightbox__body">
              <span className="gallery-card__tag">{selected.category}</span>
              <h2 id="lightbox-title">{selected.title}</h2>
              <p>{selected.description}</p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
