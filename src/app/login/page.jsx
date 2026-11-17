"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
    <div className="flex min-h-dvh items-center justify-center bg-bg px-5 py-10">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-[1.5rem] border border-border bg-card p-8 shadow-[0_24px_60px_-28px_rgba(16,37,28,0.28)]"
      >
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <img
            src="/brand/hukum-logo.png"
            alt="Hukum"
            width={56}
            height={56}
            className="h-14 w-14 rounded-2xl object-contain"
          />
          <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">
            {t(lang, "brand")}
          </p>
          <h1 className="m-0 text-[1.35rem] font-semibold tracking-[-0.03em] text-text">
            {t(lang, "loginTitle")}
          </h1>
          <p className="m-0 text-[13px] text-muted">{t(lang, "loginSubtitle")}</p>
        </div>

        <label className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          {t(lang, "fieldEmail")}
          <input
            className="mt-1.5 h-11 w-full rounded-[0.9rem] border border-border bg-input px-3.5 text-[13px] text-text outline-none transition focus:border-gold/40 focus:bg-white focus:ring-4 focus:ring-gold/10"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />
        </label>
        <label className="mt-4 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          {t(lang, "fieldPassword")}
          <input
            className="mt-1.5 h-11 w-full rounded-[0.9rem] border border-border bg-input px-3.5 text-[13px] text-text outline-none transition focus:border-gold/40 focus:bg-white focus:ring-4 focus:ring-gold/10"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>

        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

        <button
          type="submit"
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full bg-gold text-[12px] font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-gold-hover disabled:opacity-60"
          disabled={busy}
        >
          {busy ? "…" : t(lang, "navLogin")}
        </button>

        <p className="mt-4 text-center text-sm text-muted">
          <Link href="/forgot-password" className="font-medium text-gold hover:underline">
            {t(lang, "forgot")}
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-muted">
          <Link href="/register" className="font-medium text-gold hover:underline">
            {t(lang, "createAccount")}
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-bg" />}>
      <LoginForm />
    </Suspense>
  );
}
