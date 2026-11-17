"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api-client";

function ResetForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const email = useMemo(() => sp.get("email") || "", [sp]);
  const token = useMemo(() => sp.get("token") || "", [sp]);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(apiUrl("/api/auth"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "reset_password", email, token, password }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Reset failed");
      setMessage("Password updated. Redirecting to login…");
      setTimeout(() => router.replace("/login"), 1200);
    } catch (err) {
      setError(err.message || "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  if (!email || !token) {
    return (
      <p className="text-sm text-danger">
        Missing reset token. Request a new link from{" "}
        <Link href="/forgot-password" className="underline">
          forgot password
        </Link>
        .
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-3">
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {message ? <p className="text-sm text-gold">{message}</p> : null}
      <p className="text-sm text-muted">Account: {email}</p>
      <label className="block text-sm text-muted">
        New password (min 8)
        <input
          type="password"
          className="input-field mt-1"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
      </label>
      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6">
        <h1 className="text-2xl font-semibold">Reset password</h1>
        <Suspense fallback={<p className="mt-4 text-sm text-muted">Loading…</p>}>
          <ResetForm />
        </Suspense>
        <Link href="/login" className="btn-outline mt-4 inline-flex">
          Back to login
        </Link>
      </div>
    </div>
  );
}
