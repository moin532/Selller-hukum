"use client";

import { useEffect, useState } from "react";
import { SellerShell } from "@/components/layout/SellerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { fetchMyVendor, updateMyVendor } from "@/services/company-api";

export default function CustomDomainPage() {
  const [vendor, setVendor] = useState(null);
  const [domain, setDomain] = useState("");
  const [saved, setSaved] = useState("");
  const [msg, setMsg] = useState("");
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
  }, []);

  async function save(e) {
    e.preventDefault();
    const cleaned = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    setBusy(true);
    setMsg("");
    try {
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
        subtitle="Map your own domain to your Hukum storefront."
      />

      {defaultUrl ? (
        <div className="mb-4 rounded-xl border border-border bg-card p-4 text-sm">
          <p className="m-0 break-all text-xs text-muted">Default storefront: {defaultUrl}</p>
        </div>
      ) : null}

      {msg ? <p className="mb-3 text-sm text-gold">{msg}</p> : null}

      <form onSubmit={save} className="max-w-md space-y-3 rounded-xl border border-border bg-card p-5">
        <label className="block text-sm">
          Custom domain
          <input
            className="input-field mt-1 w-full"
            placeholder="shop.yourcompany.sa"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            disabled={busy}
          />
        </label>
        {saved ? (
          <p className="m-0 text-xs text-muted">
            DNS: CNAME <code>{saved}</code> → <code>store.hukum-ksa.com</code>
          </p>
        ) : null}
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Saving…" : "Save & request provisioning"}
        </button>
      </form>
    </SellerShell>
  );
}
