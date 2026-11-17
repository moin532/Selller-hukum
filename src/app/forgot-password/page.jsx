"use client";

import { useState } from "react";
import Link from "next/link";
import { apiUrl } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [demoUrl, setDemoUrl] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    setDemoUrl("");
    try {
      const resetBaseUrl =
        typeof window !== "undefined" ? `${window.location.origin}` : "https://seller.hukum-ksa.com";
      const res = await fetch(apiUrl("/api/auth"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "forgot_password",
          email,
          resetBaseUrl,
          resetPath: "/reset-password",
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Request failed");
      setMessage("If an account exists for that email, a reset link was sent.");
      if (json.data?.demoResetUrl) setDemoUrl(json.data.demoResetUrl);
    } catch (err) {
      setError(err.message || "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6">
        <h1 className="text-2xl font-semibold">Forgot password</h1>
        <p className="mt-2 text-sm text-muted">Enter your seller email. We’ll send a one-hour reset link.</p>
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        {message ? <p className="mt-3 text-sm text-gold">{message}</p> : null}
        {demoUrl ? (
          <p className="mt-2 break-all text-xs text-muted">
            Demo link (email stub):{" "}
            <a className="text-gold underline" href={demoUrl}>
              Open reset
            </a>
          </p>
        ) : null}
        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <label className="block text-sm text-muted">
            Email
            <input
              type="email"
              className="input-field mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? "Sending…" : "Send reset link"}
          </button>
        </form>
        <Link href="/login" className="btn-outline mt-4 inline-flex">
          Back to login
        </Link>
      </div>
    </div>
  );
}
