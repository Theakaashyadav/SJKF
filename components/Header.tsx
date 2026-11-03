"use client";

import { Languages, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { navLinks } from "@/lib/site";
import { useLanguage } from "@/components/LanguageProvider";

export function Header() {
  const { language, toggleLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const pathname = usePathname().replace(/\/+$/, "") || "/";
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
          <p>{t("Registered Section 8 Non-Profit Organization")}</p>
          <div className="utility-bar__actions">
            <p className="utility-bar__motto">{t("Serving Humanity · Protecting Animals · Empowering Communities")}</p>
            <button
              type="button"
              className="language-toggle"
              onClick={toggleLanguage}
              aria-label={language === "en" ? "Switch to Hindi" : "अंग्रेज़ी में बदलें"}
              title={language === "en" ? "हिन्दी में बदलें" : "Switch to English"}
            >
              <Languages aria-hidden="true" />
              <span lang={language}>{language === "en" ? "English" : "हिन्दी"}</span>
            </button>
          </div>
        </div>
      </div>
      <div className="container site-header__inner">
        <Logo />
        <nav className="desktop-nav" aria-label={t("Primary navigation")}>
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? "is-active" : undefined}
              aria-current={pathname === item.href ? "page" : undefined}
            >
              {t(item.label)}
            </Link>
          ))}
        </nav>
        <Link className="button button--gold header-donate" href="/donate">
          {t("Donate now")}
        </Link>
        <button
          ref={menuButtonRef}
          className="menu-toggle"
          type="button"
          aria-label={t(open ? "Close navigation" : "Open navigation")}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
    </header>
    {open ? <div ref={mobileNavRef} id="mobile-navigation" className="mobile-nav is-open" onKeyDown={trapMenuFocus}>
        <nav aria-label={t("Mobile navigation")}>
          {navLinks.map((item) => (
            <Link key={item.href} href={item.href} className={pathname === item.href ? "is-active" : undefined} aria-current={pathname === item.href ? "page" : undefined}>
              {t(item.label)}
            </Link>
          ))}
          <Link className="button button--gold" href="/donate">{t("Donate now")}</Link>
        </nav>
    </div> : null}
    {!open && !['/', '/donate', '/payment-success', '/payment-failed'].includes(pathname) ? <Link className="mobile-sticky-donate" href="/donate">{t("Donate now")}</Link> : null}
    </>
  );
}
