"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { getSellerUser } from "@/lib/session";
import { useTheme } from "@/components/providers/ThemeProvider";

const STEPS = [
  { href: "/register/company", label: { en: "Company", ar: "الشركة" } },
  { href: "/register/documents", label: { en: "Documents", ar: "المستندات" } },
  { href: "/register/review", label: { en: "Review", ar: "مراجعة" } },
  { href: "/register/submitted", label: { en: "Submitted", ar: "تم الإرسال" } },
];

export function OnboardingShell({ title, children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { lang } = useTheme();

  useEffect(() => {
    const u = getSellerUser();
    if (!u?.vendorId) router.replace("/register");
  }, [router]);

  return (
    <MarketingShell>
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <h1 className="text-2xl font-semibold text-text">{title}</h1>
        <ol className="mt-4 flex flex-wrap gap-2">
          {STEPS.map((s, i) => {
            const active = pathname === s.href;
            return (
              <li key={s.href}>
                <Link
                  href={s.href}
                  className={`rounded-lg border px-3 py-1.5 text-xs ${
                    active ? "border-gold bg-gold-muted text-gold" : "border-border text-muted"
                  }`}
                >
                  {i + 1}. {lang === "ar" ? s.label.ar : s.label.en}
                </Link>
              </li>
            );
          })}
        </ol>
        <div className="card mt-6 p-5 sm:p-6">{children}</div>
      </div>
    </MarketingShell>
  );
}
