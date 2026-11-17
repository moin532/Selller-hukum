"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SellerShell } from "@/components/layout/SellerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { apiGet, apiPost } from "@/lib/api-client";
import { fetchMyVendor } from "@/services/company-api";

const FALLBACK = [
  {
    key: "free",
    name: { en: "Free" },
    chargeSar: 0,
    priceSar: 0,
    vatIncluded: true,
    blurb: { en: "Verified storefront, organised leads, and basic inbox." },
    matrix: {
      storefront: "Yes",
      leads: "Standard matching",
      crm: "Basic inbox",
      analytics: "Views",
      support: "Help centre",
    },
  },
  {
    key: "gold",
    name: { en: "Gold" },
    chargeSar: 368,
    priceSar: 320,
    vatIncluded: false,
    blurb: { en: "AI catalogue, guaranteed matched leads, full CRM, priority support." },
    matrix: {
      storefront: "Yes + AI catalogue builder",
      leads: "Guaranteed matched leads / month + priority (labelled)",
      crm: "Full CRM",
      analytics: "Views, reveals, response benchmarks",
      support: "Priority",
    },
    highlight: true,
  },
  {
    key: "premium",
    name: { en: "Premium" },
    chargeSar: 4000,
    priceSar: 3478,
    vatIncluded: false,
    blurb: { en: "Custom domain, highest lead allocation, demand radar, dedicated RM + ERP." },
    matrix: {
      storefront: "Yes + custom domain",
      leads: "Highest allocation + dedicated manager",
      crm: "Full CRM + team seats",
      analytics: "Plus companies that viewed you, demand radar",
      support: "Dedicated relationship manager, ERP integration",
    },
  },
];

function priceLabel(p) {
  if (!p.chargeSar) return "SAR 0";
  if (p.vatIncluded) return `SAR ${p.chargeSar.toLocaleString()} / mo incl. VAT`;
  return `SAR ${p.priceSar} / mo + VAT (total SAR ${p.chargeSar})`;
}

export default function PricingPage() {
  const [plans, setPlans] = useState(FALLBACK);
  const [current, setCurrent] = useState("free");
  const [value, setValue] = useState(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    apiGet("/api/monetisation?resource=plans")
      .then(({ json }) => {
        if (json.success && Array.isArray(json.data?.plans)) setPlans(json.data.plans);
      })
      .catch(() => undefined);
    apiGet("/api/monetisation?resource=me")
      .then(({ json }) => {
        if (json.success && json.data?.planKey) setCurrent(json.data.planKey);
      })
      .catch(() => undefined);
    Promise.all([
      fetchMyVendor().catch(() => null),
      apiGet("/api/seller-analytics?range=30d"),
    ]).then(([vendor, analytics]) => {
      const roll = analytics.json?.success ? analytics.json.data : null;
      const key = vendor?.subscriptionPlanKey || vendor?.plan || "free";
      setCurrent(key);
      setValue({
        vendorName: vendor?.tradeName || vendor?.legalName?.en,
        verified: vendor?.verificationStatus === "verified",
        views: roll?.kpis?.storefrontViews ?? roll?.totals?.views ?? "—",
        leads: roll?.kpis?.leads ?? roll?.totals?.contacts ?? "—",
        quotes: roll?.kpis?.quotations ?? roll?.totals?.quotes ?? "—",
        completeness: vendor?.completenessScore ?? "—",
      });
    });
  }, []);

  async function checkout(planKey) {
    setBusy(planKey);
    setError("");
    setMsg("");
    try {
      const { json } = await apiPost("/api/monetisation", {
        action: "subscribe",
        plan: planKey,
      });
      if (!json.success) throw new Error(json.message || "Checkout failed");
      setCurrent(planKey);
      setMsg(
        planKey === "free"
          ? "You are on the Free plan."
          : json.data?.mode === "promo_free"
            ? `${planKey} activated free through 2027 — no charge today.`
            : `${json.data?.plan?.name?.en || planKey} activated — SAR ${json.data?.plan?.chargeSar ?? json.data?.chargeSar ?? ""} (+VAT model).`
      );
    } catch (e) {
      setError(e.message || "Checkout failed");
    } finally {
      setBusy("");
    }
  }

  return (
    <SellerShell title="Upgrade">
      <PageHeader
        title="Supplier plans — Free, Gold, Premium"
        subtitle="Subscriptions are the committed model; partner services (2029+) are upside. Hukum never holds buyer funds."
        actions={
          <Link href="/dashboard/partner-services" className="rounded-lg border border-border px-3 py-2 text-sm font-semibold">
            Partner services
          </Link>
        }
      />

      <p className="mb-4 text-sm text-muted">
        Current plan: <span className="font-semibold capitalize text-text">{current}</span>
      </p>
      <p className="mb-4 rounded-lg border border-gold/40 bg-gold-muted/40 px-3 py-2 text-sm text-text">
        Introductory offer: Gold and Premium are free through 31 Dec 2027. Prices below show the post-promo rate (list + 15% VAT).
      </p>

      {value ? (
        <div className="mb-6 rounded-xl border border-gold/30 bg-gold-muted/30 p-4">
          <p className="m-0 text-xs font-semibold uppercase tracking-wide text-muted">Value delivered so far</p>
          <p className="mt-1 mb-3 text-sm text-text">
            {value.vendorName || "Your company"}
            {value.verified ? " · Verified" : " · Complete verification to unlock the trusted badge"}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Storefront views", value.views],
              ["Leads / contacts", value.leads],
              ["Quotations", value.quotes],
              ["Profile score", value.completeness],
            ].map(([label, v]) => (
              <div key={label} className="rounded-lg border border-border bg-card px-3 py-2">
                <p className="m-0 text-[10px] uppercase text-muted">{label}</p>
                <p className="mt-1 mb-0 text-lg font-semibold text-text">{v}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {msg ? <p className="mb-3 text-sm text-gold">{msg}</p> : null}
      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}

      <div className="mb-8 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted/20 text-left text-xs uppercase text-muted">
            <tr>
              <th className="p-3">Feature</th>
              {plans.map((p) => (
                <th key={p.key} className="p-3 capitalize">
                  {p.name?.en || p.key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border">
              <td className="p-3 font-medium">Price</td>
              {plans.map((p) => (
                <td key={p.key} className="p-3 font-semibold">
                  {priceLabel(p)}
                </td>
              ))}
            </tr>
            {["storefront", "leads", "crm", "analytics", "support"].map((row) => (
              <tr key={row} className="border-t border-border">
                <td className="p-3 capitalize text-muted">{row.replace(/_/g, " ")}</td>
                {plans.map((p) => (
                  <td key={p.key} className="p-3 text-xs">
                    {p.matrix?.[row] || "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((p) => {
          const highlight = p.key === "gold" || p.highlight;
          const isCurrent = current === p.key;
          return (
            <div
              key={p.key}
              className={`flex flex-col rounded-xl border p-5 ${
                highlight ? "border-gold bg-gold/5" : "border-border bg-card"
              }`}
            >
              <p className="m-0 text-xs font-semibold uppercase tracking-wide text-muted">
                {p.name?.en || p.key}
              </p>
              <p className="mt-2 mb-0 text-xl font-bold text-text">{priceLabel(p)}</p>
              <p className="mt-2 mb-4 text-sm text-text">{p.blurb?.en}</p>
              <button
                type="button"
                disabled={busy === p.key || isCurrent}
                onClick={() => void checkout(p.key)}
                className={`mt-auto rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50 ${
                  highlight ? "bg-gold text-white" : "border border-border"
                }`}
              >
                {busy === p.key ? "…" : isCurrent ? "Current plan" : p.key === "free" ? "Switch to Free" : `Upgrade to ${p.name?.en || p.key}`}
              </button>
            </div>
          );
        })}
      </div>
    </SellerShell>
  );
}
