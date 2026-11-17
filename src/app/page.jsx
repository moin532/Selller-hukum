"use client";

import Link from "next/link";
import Image from "next/image";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { useTheme } from "@/components/providers/ThemeProvider";
import { t } from "@/lib/marketing-i18n";

export default function SellerLandingPage() {
  const { lang } = useTheme();

  const benefits = [
    { title: t(lang, "benefit1Title"), body: t(lang, "benefit1Body") },
    { title: t(lang, "benefit2Title"), body: t(lang, "benefit2Body") },
    { title: t(lang, "benefit3Title"), body: t(lang, "benefit3Body") },
    { title: t(lang, "benefit4Title"), body: t(lang, "benefit4Body") },
  ];

  const steps = [t(lang, "how1"), t(lang, "how2"), t(lang, "how3"), t(lang, "how4")];

  return (
    <MarketingShell>
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0">
          <Image
            src="/images/saudi-supplier-hero.jpg"
            alt=""
            fill
            priority
            className="object-cover object-[70%_center]"
            sizes="100vw"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, var(--bg) 0%, color-mix(in srgb, var(--bg) 90%, transparent) 45%, color-mix(in srgb, var(--bg) 20%, transparent) 100%)",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.16em] text-gold">{t(lang, "brand")}</p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight text-text md:text-4xl lg:text-5xl">
              {t(lang, "headline")}
            </h1>
            <p className="mt-4 text-base text-muted md:text-lg">{t(lang, "support")}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/register" className="btn-primary">
                {t(lang, "ctaRegister")}
              </Link>
              <Link href="/login" className="btn-outline">
                {t(lang, "ctaLogin")}
              </Link>
            </div>
            <ul className="mt-8 space-y-2 text-sm text-muted">
              <li className="flex gap-2">
                <span className="text-gold">—</span>
                {t(lang, "value1")}
              </li>
              <li className="flex gap-2">
                <span className="text-gold">—</span>
                {t(lang, "value2")}
              </li>
              <li className="flex gap-2">
                <span className="text-gold">—</span>
                {t(lang, "value3")}
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section id="benefits" className="mx-auto max-w-6xl px-4 py-14 md:px-6">
        <h2 className="text-2xl font-semibold text-text">{t(lang, "benefitsTitle")}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b) => (
            <article key={b.title} className="rounded-xl border border-border bg-card p-4">
              <h3 className="m-0 text-sm font-semibold text-text">{b.title}</h3>
              <p className="mt-2 text-sm text-muted">{b.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="border-y border-border bg-sidebar">
        <div className="mx-auto max-w-6xl px-4 py-14 md:px-6">
          <h2 className="text-2xl font-semibold text-text">{t(lang, "howTitle")}</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((label, i) => (
              <li key={label} className="rounded-xl border border-border bg-card p-4">
                <p className="m-0 text-xs uppercase tracking-wide text-gold">
                  {lang === "ar" ? `الخطوة ${i + 1}` : `Step ${i + 1}`}
                </p>
                <p className="mt-2 text-sm font-medium text-text">{label}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 max-w-3xl text-sm text-muted">{t(lang, "howNote")}</p>
        </div>
      </section>

      <section id="support" className="mx-auto max-w-6xl px-4 py-14 md:px-6">
        <h2 className="text-2xl font-semibold text-text">{t(lang, "navSupport")}</h2>
        <p className="mt-3 max-w-2xl text-sm text-muted">
          {lang === "ar"
            ? "للمساعدة في التسجيل أو التحقق، راسل support@kingdomtrade.sa. صفحات الشروط والخصوصية العامة ستُنشر عند اعتمادها."
            : "For registration or verification help, email support@kingdomtrade.sa. Public Terms and Privacy pages will link here when published."}
        </p>
        <a href="mailto:support@kingdomtrade.sa" className="mt-4 inline-flex btn-outline">
          support@kingdomtrade.sa
        </a>
      </section>
    </MarketingShell>
  );
}
