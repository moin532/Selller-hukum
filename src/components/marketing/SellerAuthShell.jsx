"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, BadgeCheck, Inbox, Store } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";

const MARKETPLACE_URL = (process.env.NEXT_PUBLIC_MARKETPLACE_URL || "https://hukum-ksa.com").replace(/\/$/, "");

/**
 * Seller auth frame — mirrors Hukum marketplace AuthShell:
 * form column + deep-green brand panel for suppliers.
 */
export function SellerAuthShell({ children, wide = false }) {
  const { lang, setLang } = useTheme();
  const isAr = lang === "ar";
  const marketplaceHome = `${MARKETPLACE_URL}/${isAr ? "ar" : "en"}`;

  const points = [
    {
      Icon: Inbox,
      text: isAr ? "طلبات تطابق ما تبيعه" : "Buyer requests matched to what you sell",
    },
    {
      Icon: Store,
      text: isAr ? "متجرك ومنتجاتك وكتالوجك في مكان واحد" : "Storefront, products and catalogue in one place",
    },
    {
      Icon: BadgeCheck,
      text: isAr ? "توثيق يراه المشترون — يُكتسب ولا يُشترى" : "Verification buyers can see — earned, never bought",
    },
  ];

  return (
    <div className={`seller-auth${wide ? " is-wide" : ""}`} dir={isAr ? "rtl" : "ltr"}>
      <main className="seller-auth__side">
        <header className="seller-auth__top">
          <Link href="/" className="seller-auth__logo" aria-label="Hukum">
            <Image
              src="/brand/logo-wordmark.png"
              alt="Hukum"
              width={140}
              height={40}
              className="h-10 w-auto object-contain"
              priority
            />
          </Link>
          <div className="seller-auth__top-links">
            <button
              type="button"
              className="seller-auth__lang"
              onClick={() => setLang(isAr ? "en" : "ar")}
            >
              {isAr ? "English" : "العربية"}
            </button>
            <a href={marketplaceHome} className="seller-auth__back">
              <ArrowLeft size={15} aria-hidden />
              {isAr ? "رجوع لحكم" : "Back to Hukum"}
            </a>
          </div>
        </header>

        <div className="seller-auth__form">{children}</div>

        <footer className="seller-auth__foot">
          <a href={`${marketplaceHome}/privacy`}>{isAr ? "الخصوصية" : "Privacy"}</a>
          <a href={`${marketplaceHome}/terms`}>{isAr ? "الشروط" : "Terms"}</a>
          <Link href="/">{isAr ? "المساعدة" : "Help"}</Link>
        </footer>
      </main>

      <aside className="seller-auth__panel" aria-hidden>
        <div className="seller-auth__pattern" />
        <div className="seller-auth__panel-inner">
          <p className="seller-auth__eyebrow">
            {isAr ? "بوابة الموردين" : "Supplier portal"}
          </p>
          <h2>
            {isAr ? "مساحة المورد على حكم" : "Your supplier workspace on Hukum"}
          </h2>
          <ul>
            {points.map((p) => (
              <li key={p.text}>
                <span>
                  <p.Icon size={18} strokeWidth={1.75} />
                </span>
                {p.text}
              </li>
            ))}
          </ul>
          <div className="seller-auth__card">
            <small>{isAr ? "طلب جديد" : "New request"}</small>
            <b>{isAr ? "صينية كابلات 300 مم — 120 طول" : "Cable tray 300 mm — 120 lengths"}</b>
            <span>{isAr ? "التوصيل إلى الرياض" : "Deliver to Riyadh"}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
