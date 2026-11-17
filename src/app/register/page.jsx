"use client";

import Link from "next/link";
import Image from "next/image";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { RegisterCard } from "@/components/marketing/RegisterCard";
import { useTheme } from "@/components/providers/ThemeProvider";
import { t } from "@/lib/marketing-i18n";

export default function RegisterPage() {
  const { lang } = useTheme();
  const isAr = lang === "ar";

  return (
    <MarketingShell>
      <div className="seller-reg-page">
        <aside className="seller-reg-aside">
          <div className="seller-reg-aside__brand">
            <Image src="/brand/hukum-logo.png" alt="Hukum" width={44} height={44} className="h-11 w-11 object-contain" />
            <span>Hukum</span>
          </div>
          <p className="seller-reg-aside__eyebrow">{t(lang, "brand")}</p>
          <h1 className="seller-reg-aside__title">{t(lang, "ctaRegister")}</h1>
          <p className="seller-reg-aside__lead">{t(lang, "regSubtitle")}</p>

          <ol className="seller-reg-aside__flow">
            <li>
              <strong>1</strong>
              <div>
                <p>{t(lang, "how1")}</p>
                <span>{isAr ? "بريد + كلمة مرور — بدون Google / Microsoft" : "Email + password — no Google / Microsoft"}</span>
              </div>
            </li>
            <li>
              <strong>2</strong>
              <div>
                <p>{t(lang, "how2")}</p>
                <span>{isAr ? "البيانات القانونية والتواصل" : "Legal & contact details"}</span>
              </div>
            </li>
            <li>
              <strong>3</strong>
              <div>
                <p>{t(lang, "how3")}</p>
                <span>{isAr ? "رفع المستندات المطلوبة" : "Upload required documents"}</span>
              </div>
            </li>
            <li>
              <strong>4</strong>
              <div>
                <p>{t(lang, "how4")}</p>
                <span>{isAr ? "مراجعة وإرسال للتحقق" : "Review & submit for verification"}</span>
              </div>
            </li>
          </ol>

          <p className="seller-reg-aside__note">{t(lang, "howNote")}</p>
          <p className="seller-reg-aside__login">
            <Link href="/login">{t(lang, "ctaLogin")}</Link>
          </p>
        </aside>

        <div className="seller-reg-main">
          <RegisterCard />
        </div>
      </div>
    </MarketingShell>
  );
}
