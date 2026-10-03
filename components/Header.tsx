"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { navLinks } from "@/lib/site";

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  useEffect(() => {
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);
  useEffect(() => {
    if (open) window.requestAnimationFrame(() => mobileNavRef.current?.querySelector<HTMLElement>("a")?.focus());
  }, [open]);

  function trapMenuFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;
    const links = Array.from(mobileNavRef.current?.querySelectorAll<HTMLElement>("a") || []);
    if (!links.length) return;
    const first = links[0];
    const last = links[links.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  return (
    <>
    <header className="site-header">
      <div className="utility-bar">
        <div className="container utility-bar__inner">
          <p>Registered Section 8 Non-Profit Organization</p>
          <p className="utility-bar__motto">Serving Humanity · Protecting Animals · Empowering Communities</p>
        </div>
      </div>
      <div className="container site-header__inner">
        <Logo />
        <nav className="desktop-nav" aria-label="Primary navigation">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? "is-active" : undefined}
              aria-current={pathname === item.href ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link className="button button--gold header-donate" href="/donate">
          Donate now
        </Link>
        <button
          ref={menuButtonRef}
          className="menu-toggle"
          type="button"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
    </header>
    {open ? <div ref={mobileNavRef} id="mobile-navigation" className="mobile-nav is-open" onKeyDown={trapMenuFocus}>
        <nav aria-label="Mobile navigation">
          {navLinks.map((item) => (
            <Link key={item.href} href={item.href} className={pathname === item.href ? "is-active" : undefined} aria-current={pathname === item.href ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
          <Link className="button button--gold" href="/donate">Donate now</Link>
        </nav>
    </div> : null}
    {!open && !['/', '/donate', '/payment-success', '/payment-failed'].includes(pathname) ? <Link className="mobile-sticky-donate" href="/donate">Donate now</Link> : null}
    </>
  );
}
