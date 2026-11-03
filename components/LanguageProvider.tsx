"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { commonTranslations } from "@/lib/translations-common";
import { pageTranslations } from "@/lib/translations-pages";
import { formTranslations } from "@/lib/translations-forms";

type Language = "en" | "hi";
type LanguageContextValue = {
  language: Language;
  toggleLanguage: () => void;
  t: (text: string) => string;
};

const storageKey = "swabhiman-language";
const translations: Record<string, string> = { ...pageTranslations, ...formTranslations, ...commonTranslations };
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    try {
      if (window.localStorage.getItem(storageKey) === "hi") setLanguage("hi");
    } catch {
      // The switch still works when browser storage is unavailable.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const toggleLanguage = useCallback(() => {
    const nextLanguage = language === "en" ? "hi" : "en";
    setLanguage(nextLanguage);
    try { window.localStorage.setItem(storageKey, nextLanguage); } catch { /* Storage is optional. */ }
  }, [language]);

  const t = useCallback((text: string) => {
    if (language === "en") return text;
    const normalized = text.replace(/\s+/g, " ").trim();
    const translated = translations[text] ?? translations[normalized];
    if (!translated) return text;
    return `${text.match(/^\s*/)?.[0] || ""}${translated}${text.match(/\s*$/)?.[0] || ""}`;
  }, [language]);

  const value = useMemo(() => ({ language, toggleLanguage, t }), [language, toggleLanguage, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}

export function T({ children }: { children: string | number }) {
  const { t } = useLanguage();
  return <>{t(String(children))}</>;
}
