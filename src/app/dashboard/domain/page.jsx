"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SellerShell } from "@/components/layout/SellerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { apiGet, apiPost } from "@/lib/api-client";
import { fetchMyVendor, updateMyVendor } from "@/services/company-api";

export default function CustomDomainPage() {
  const [vendor, setVendor] = useState(null);
  const [domain, setDomain] = useState("");
  const [saved, setSaved] = useState("");
  const [msg, setMsg] = useState("");
  const [allowed, setAllowed] = useState(false);
  const [planKey, setPlanKey] = useState("free");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchMyVendor()
      .then((v) => {
        setVendor(v);
        const d = v?.customDomain || "";
        setDomain(d);
        setSaved(d);
      })
      .catch(() => setVendor(null));
    apiGet("/api/monetisation?resource=me")
      .then(({ json }) => {
        if (json.success) {
          setPlanKey(json.data?.planKey || "free");
          setAllowed(Boolean(json.data?.entitlements?.customDomain));
        }
      })
      .catch(() => undefined);
  }, []);

  async function save(e) {
    e.preventDefault();
    const cleaned = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!allowed) {
      setMsg("Custom domain is a Premium entitlement. Upgrade to activate.");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const check = await apiPost("/api/monetisation", { action: "check_feature", feature: "customDomain" });
      if (!check.json?.success || !check.json?.data?.allowed) {
        setMsg("Upgrade to Premium required for custom domain.");
        return;
      }
      const updated = await updateMyVendor({ customDomain: cleaned });
      const next = updated?.customDomain || cleaned;
      setVendor(updated);
      setSaved(next);
      setDomain(next);
      setMsg("Domain saved to your seller account (MongoDB). DNS CNAME → store.hukum-ksa.com");
    } catch (err) {
      setMsg(err.message || "Failed to save domain");
    } finally {
      setBusy(false);
    }
  }

  const slug = vendor?.slug?.en || vendor?.slug || "";
  const defaultUrl = slug ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/en/vendors/${slug}` : "";

  return (
    <SellerShell title="Custom domain">
      <PageHeader
        title="Custom domain microsite"
        subtitle="Premium: map your own domain to your Hukum storefront."
        actions={
          !allowed ? (
            <Link href="/dashboard/pricing" className="rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-white">
              Upgrade to Premium
            </Link>
          ) : null
        }
      />

      <div className="mb-4 rounded-xl border border-border bg-card p-4 text-sm">
        <p className="m-0 text-xs uppercase text-muted">Current plan</p>
        <p className="mt-1 mb-0 font-semibold capitalize">{planKey}</p>
        {defaultUrl ? (
          <p className="mt-2 mb-0 break-all text-xs text-muted">Default storefront: {defaultUrl}</p>
        ) : null}
      </div>

      {msg ? <p className="mb-3 text-sm text-gold">{msg}</p> : null}

      <form onSubmit={save} className="max-w-md space-y-3 rounded-xl border border-border bg-card p-5">
        <label className="block text-sm">
          Custom domain
          <input
            className="input-field mt-1 w-full"
            placeholder="shop.yourcompany.sa"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            disabled={!allowed || busy}
          />
        </label>
        {saved ? (
          <p className="m-0 text-xs text-muted">
            DNS: CNAME <code>{saved}</code> → <code>store.hukum-ksa.com</code>
          </p>
        ) : null}
        <button type="submit" className="btn-primary" disabled={!allowed || busy}>
          {busy ? "Saving…" : allowed ? "Save & request provisioning" : "Premium required"}
        </button>
      </form>
    </SellerShell>
  );
}
