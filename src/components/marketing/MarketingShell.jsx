"use client";

import Link from "next/link";
import Image from "next/image";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { t } from "@/lib/marketing-i18n";

/** Marketing chrome — redesign visual (calligraphy, chips) with existing i18n + links. */
export function MarketingShell({ children, active = "" }) {
  const { theme, setTheme, lang, setLang } = useTheme();
  const isAr = lang === "ar";

  const links = [
    { id: "how", href: "/#how-it-works", label: t(lang, "navHow") },
    { id: "benefits", href: "/#benefits", label: t(lang, "navBenefits") },
    { id: "support", href: "/#support", label: t(lang, "navSupport") },
  ];

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/brand/hukum-calligraphy.png"
              alt="Hukum"
              width={120}
              height={40}
              className="h-10 w-auto object-contain"
              priority
            />
          </Link>
          <nav className="hidden items-center gap-5 text-sm text-muted md:flex">
            {links.map((l) => (
              <a
                key={l.id}
                href={l.href}
                className={active === l.id ? "text-gold" : "hover:text-text"}
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-outline"
              onClick={() => setLang(isAr ? "en" : "ar")}
              aria-label="Language"
            >
              {isAr ? "EN" : "العربية"}
            </button>
            <button
              type="button"
              className="btn-icon"
              aria-label="Theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Link href="/login" className="btn-outline hidden sm:inline-flex">
              {t(lang, "navLogin")}
            </Link>
            <Link href="/register" className="btn-primary">
              {t(lang, "navRegister")}
            </Link>
          </div>
        </div>
      </header>
      {children}
      <footer className="border-t border-border bg-sidebar">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-4 px-4 py-8 text-sm text-muted md:px-6">
          <span className="w-full font-medium text-text md:w-auto">{t(lang, "brand")}</span>
          <span className="text-muted">{t(lang, "footerAbout")}</span>
          <a href="/#support" className="hover:text-gold">
            {t(lang, "footerSupport")}
          </a>
          <a href="mailto:support@hukum.sa" className="hover:text-gold">
            {t(lang, "footerContact")}
          </a>
        </div>
      </footer>
    </div>
  );
}
