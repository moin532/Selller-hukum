"use client";

import { useEffect, useMemo, useState } from "react";
import { SellerShell } from "@/components/layout/SellerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShareKit } from "@/components/storefront/ShareKit";
import { fetchMyVendor } from "@/services/company-api";

function makeCode(seed) {
  const base = String(seed || "hukum")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 8)
    .toUpperCase();
  return `HK-${base || "SELLER"}`;
}

export default function ReferralPage() {
  const [vendor, setVendor] = useState(null);
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchMyVendor()
      .then((v) => {
        setVendor(v);
        setCode(makeCode(v?.slug?.en || v?.tradeName || v?._id));
      })
      .catch(() => {
        setCode(makeCode("guest"));
      });
  }, []);

  const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000").replace(/\/$/, "");
  const slug = vendor?.slug?.en || vendor?.slug || "";
  const storeUrl = slug ? `${API_BASE}/en/vendors/${slug}` : "";
  const referralUrl = useMemo(() => {
    const base = storeUrl || `${API_BASE}/en/register`;
    const join = base.includes("?") ? "&" : "?";
    return `${base}${join}ref=${encodeURIComponent(code || "HK")}`;
  }, [storeUrl, API_BASE, code]);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <SellerShell title="Referral">
      <PageHeader
        title="Referral programme & share kit"
        subtitle="Share your storefront and referral link. Rewards settle when referred sellers activate a paid plan."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="m-0 text-[10px] uppercase text-muted">Your referral code</p>
          <p className="mt-2 mb-0 font-mono text-xl font-semibold tracking-wide">{code || "—"}</p>
          <button type="button" onClick={() => void copyCode()} className="mt-3 text-xs font-semibold text-gold">
            {copied ? "Copied" : "Copy code"}
          </button>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="m-0 text-[10px] uppercase text-muted">Reward (scaffold)</p>
          <p className="mt-2 mb-0 text-sm">1 month Growth credit per activated referral (demo rules).</p>
        </div>
      </div>

      <ShareKit publicUrl={referralUrl} companyName={vendor?.tradeName || vendor?.legalName?.en || "Hukum supplier"} />
    </SellerShell>
  );
}
