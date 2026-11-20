"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { useTheme } from "@/components/providers/ThemeProvider";
import { t } from "@/lib/marketing-i18n";
import { loginSeller } from "@/services/auth-api";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const { lang } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await loginSeller(email.trim(), password);
      const next = search.get("next");
      const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
      router.replace(safeNext);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <MarketingShell>
      <div className="mx-auto max-w-md px-4 py-8 md:py-14">
        <div className="card p-6 shadow-lg sm:p-8">
          <Image
            src="/brand/hukum-calligraphy.png"
            alt="Hukum"
            width={140}
            height={48}
            className="mx-auto mb-4 h-12 w-auto object-contain"
            priority
          />
          <h1 className="m-0 text-center text-2xl font-semibold">{t(lang, "loginTitle")}</h1>
          <p className="mt-1.5 mb-0 text-center text-sm text-muted">{t(lang, "loginSubtitle")}</p>

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              {t(lang, "fieldEmail")}
              <input
                className="input-field mt-1.5"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                dir="ltr"
              />
            </label>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              {t(lang, "fieldPassword")}
              <input
                className="input-field mt-1.5"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                dir="ltr"
              />
            </label>

            {error ? (
              <p role="alert" className="m-0 text-sm text-danger">
                {error}
              </p>
            ) : null}

            <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
              {busy ? "…" : t(lang, "navLogin")}
            </button>

            <p className="m-0 text-center text-sm">
              <Link href="/forgot-password" className="font-medium text-gold hover:underline">
                {t(lang, "forgot")}
              </Link>
            </p>
            <p className="m-0 border-t border-border pt-4 text-center text-sm text-muted">
              <Link href="/register" className="font-medium text-gold hover:underline">
                {t(lang, "createAccount")}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </MarketingShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-bg" />}>
      <LoginForm />
    </Suspense>
  );
}
