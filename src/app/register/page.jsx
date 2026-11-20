"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, BadgeCheck, Building2, FileCheck2, ShieldCheck, Sparkles } from "lucide-react";
import { RegisterCard } from "@/components/marketing/RegisterCard";
import { useTheme } from "@/components/providers/ThemeProvider";
import { t } from "@/lib/marketing-i18n";

const MARKETPLACE_URL = (process.env.NEXT_PUBLIC_MARKETPLACE_URL || "https://hukum-ksa.com").replace(/\/$/, "");

export default function RegisterPage() {
  const { lang, setLang } = useTheme();
  const isAr = lang === "ar";
  const marketplaceHome = `${MARKETPLACE_URL}/${isAr ? "ar" : "en"}`;

  const trust = [
    {
      Icon: ShieldCheck,
      title: isAr ? "توثيق حكوم" : "Hukum verification",
      text: isAr ? "يُكتسب عبر الفحوصات — ولا يُشترى" : "Earned through checks — never bought",
    },
    {
      Icon: Building2,
      title: isAr ? "صفحة شركتك" : "Your company page",
      text: isAr ? "تُنشر بعد مراجعة بياناتك" : "Published after review of your details",
    },
    {
      Icon: FileCheck2,
      title: isAr ? "طلبات المشترين" : "Buyer requests",
      text: isAr ? "مطابقة لما تبيعه في المملكة" : "Matched to what you sell across the Kingdom",
    },
  ];

  return (
    <div className="seller-join" dir={isAr ? "rtl" : "ltr"}>
      <aside className="seller-join__hero">
        <div className="seller-join__pattern" aria-hidden />
        <div className="seller-join__hero-inner">
          <div className="seller-join__hero-top">
            <Link href="/" className="seller-join__brand" aria-label="Hukum">
              <Image
                src="/brand/logo-wordmark-on-dark.png"
                alt="Hukum"
                width={148}
                height={42}
                className="h-10 w-auto object-contain"
                priority
              />
            </Link>
            <div className="seller-join__hero-actions">
              <button type="button" className="seller-join__lang" onClick={() => setLang(isAr ? "en" : "ar")}>
                {isAr ? "English" : "العربية"}
              </button>
              <a href={marketplaceHome} className="seller-join__back">
                <ArrowLeft size={14} aria-hidden />
                {isAr ? "حكم" : "Hukum"}
              </a>
            </div>
          </div>

          <p className="seller-join__eyebrow">
            <Sparkles size={14} strokeWidth={2} aria-hidden />
            {isAr ? "إدراج تعريفي للموردين" : "Introductory listing for suppliers"}
          </p>
          <h1 className="seller-join__title">
            {isAr ? "بِع لمشترين في أنحاء المملكة" : "Sell to buyers across the Kingdom"}
          </h1>
          <p className="seller-join__subtitle" lang={isAr ? "en" : "ar"} dir={isAr ? "ltr" : "rtl"}>
            {isAr ? "Sell to buyers across the Kingdom" : "بِع لمشترين في أنحاء المملكة"}
          </p>
          <p className="seller-join__lead">{t(lang, "regSubtitle")}</p>

          <ul className="seller-join__trust">
            {trust.map((item) => (
              <li key={item.title}>
                <span className="seller-join__trust-icon" aria-hidden>
                  <item.Icon size={18} strokeWidth={1.75} />
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </div>
                <BadgeCheck size={16} className="seller-join__trust-check" aria-hidden />
              </li>
            ))}
          </ul>

          <p className="seller-join__login">
            {isAr ? "لديك حساب مورّد؟" : "Already a seller?"}{" "}
            <Link href="/login">{t(lang, "navLogin")}</Link>
          </p>
        </div>
      </aside>

      <main className="seller-join__main">
        <div className="seller-join__main-inner">
          <RegisterCard />
        </div>
      </main>
    </div>
  );
}
