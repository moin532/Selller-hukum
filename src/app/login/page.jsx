"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SellerAuthShell } from "@/components/marketing/SellerAuthShell";
import { useTheme } from "@/components/providers/ThemeProvider";
import { t } from "@/lib/marketing-i18n";
import { loginSeller } from "@/services/auth-api";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const { lang } = useTheme();
  const isAr = lang === "ar";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
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
      setError(err.message || (isAr ? "فشل تسجيل الدخول" : "Login failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SellerAuthShell>
      <h1 className="seller-auth__title">{t(lang, "loginTitle")}</h1>
      <p className="seller-auth__sub">{t(lang, "loginSubtitle")}</p>

      <form onSubmit={onSubmit} className="seller-auth__lux">
        <div className="seller-auth__lux-stack">
          <label className="seller-auth__lux-field">
            <span className="seller-auth__lux-label">{t(lang, "fieldEmail")}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              disabled={busy}
              dir="ltr"
            />
          </label>
          <label className="seller-auth__lux-field">
            <span className="seller-auth__lux-label">{t(lang, "fieldPassword")}</span>
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={busy}
              dir="ltr"
            />
            <button
              type="button"
              className="seller-auth__lux-reveal"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? (isAr ? "إخفاء" : "Hide password") : isAr ? "إظهار" : "Show password"}
            >
              {showPw ? (isAr ? "إخفاء" : "Hide") : isAr ? "إظهار" : "Show"}
            </button>
          </label>
        </div>

        {error ? (
          <p role="alert" className="seller-auth__error">
            {error}
          </p>
        ) : null}

        <button type="submit" className="seller-auth__btn" disabled={busy}>
          {busy ? (isAr ? "جارٍ تسجيل الدخول…" : "Signing in…") : t(lang, "navLogin")}
        </button>
      </form>

      <div className="seller-auth__links">
        <Link href="/forgot-password">{t(lang, "forgot")}</Link>
        <Link href="/register">{t(lang, "createAccount")}</Link>
      </div>
    </SellerAuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-white" />}>
      <LoginForm />
    </Suspense>
  );
}
