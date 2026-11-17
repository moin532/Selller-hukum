"use client";

import { useEffect, useState } from "react";
import { SellerShell } from "@/components/layout/SellerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { PlanGate } from "@/components/billing/PlanGate";
import { apiGet } from "@/lib/api-client";

export default function SellerDemandInsightsPage() {
  const [locale, setLocale] = useState("en");
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const isAr = locale === "ar";

  useEffect(() => {
    setLoading(true);
    setError("");
    apiGet(`/api/ai/demand-insights?days=${days}&locale=${locale}&scope=vendor`)
      .then(({ json }) => {
        if (!json.success) throw new Error(json.message || "Failed");
        setData(json.data);
      })
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [days, locale]);

  return (
    <SellerShell title={isAr ? "رادار الطلب" : "Demand radar"}>
      <PageHeader
        title={data?.copy?.title || (isAr ? "رادار الطلب لفئتك" : "Demand radar for your category")}
        subtitle={
          data?.copy?.subtitle ||
          (isAr
            ? "اتجاهات البحث وطلبات الأسعار المجمّعة لفئتك — بلا بيانات شخصية."
            : "Aggregated search & RFQ demand for your category — no personal data.")
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <select className="input-field" value={locale} onChange={(e) => setLocale(e.target.value)}>
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
            <select className="input-field" value={days} onChange={(e) => setDays(Number(e.target.value))}>
              <option value={7}>7d</option>
              <option value={30}>30d</option>
              <option value={90}>90d</option>
            </select>
          </div>
        }
      />

      <PlanGate feature="demandRadar" minPlan="premium">
      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
      {loading ? <p className="text-muted">Loading…</p> : null}

      {data ? (
        <>
          <p className="mb-4 text-xs text-muted">
            {data.copy?.guard} {data.source === "demo_anonymized" ? (isAr ? "· تجريبي" : "· demo") : ""}
          </p>

          {data.relevance ? (
            <div className="mb-5 rounded-xl border border-gold/40 bg-gold-muted/30 p-4">
              <p className="m-0 text-xs font-bold uppercase tracking-wide text-gold">
                {isAr ? "فرصتك" : "Your opportunity"}
              </p>
              <p className="mt-1 mb-0 text-sm">
                {isAr ? "درجة الفرصة" : "Opportunity score"}:{" "}
                <strong>{data.relevance.opportunityScore}</strong>
                {" · "}
                {isAr ? "بحث مطابق" : "Matched search volume"}: {data.relevance.matchedSearches}
              </p>
            </div>
          ) : null}

          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [isAr ? "بحث" : "Searches", data.totals?.searches],
              [isAr ? "طلبات أسعار" : "RFQs", data.totals?.rfqs],
              [isAr ? "عروض" : "Quotes", data.totals?.quotations],
              [isAr ? "منتجاتك" : "Your products", data.totals?.publishedProducts],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-border bg-card p-4">
                <p className="m-0 text-[10px] uppercase tracking-wide text-muted">{label}</p>
                <p className="mt-1 mb-0 text-2xl font-semibold">{value ?? "—"}</p>
              </div>
            ))}
          </div>

          {data.priceAlerts?.length ? (
            <div className="mb-5 space-y-2">
              <h2 className="text-sm font-semibold">{isAr ? "تنبيهات الأسعار والتغطية" : "Price & coverage alerts"}</h2>
              {data.priceAlerts.map((a, i) => (
                <div
                  key={i}
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    a.severity === "warn" ? "border-amber-400 bg-amber-50" : "border-border bg-card"
                  }`}
                >
                  {a.message}
                </div>
              ))}
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-border bg-card overflow-hidden">
              <h2 className="border-b border-border px-3 py-2 text-sm font-semibold">
                {isAr ? "أكثر عمليات البحث" : "Top searches"}
              </h2>
              <ul className="m-0 list-none p-0">
                {(data.topSearches || []).map((s) => (
                  <li key={s.query} className="flex justify-between border-b border-border px-3 py-2 text-sm">
                    <span>{s.label || s.query}</span>
                    <span className="text-muted">
                      {s.count}
                      {s.zeroResultRate ? ` · ${s.zeroResultRate}% ∅` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border border-border bg-card overflow-hidden">
              <h2 className="border-b border-border px-3 py-2 text-sm font-semibold">
                {isAr ? "المدن" : "Cities"}
              </h2>
              <ul className="m-0 list-none p-0">
                {(data.topCities || []).map((c) => (
                  <li key={c.city} className="flex justify-between border-b border-border px-3 py-2 text-sm">
                    <span>{c.label || c.city}</span>
                    <span className="text-muted">{c.count}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border border-border bg-card overflow-hidden lg:col-span-2">
              <h2 className="border-b border-border px-3 py-2 text-sm font-semibold">
                {isAr ? "مؤشر الأسعار (وسيط ر.س)" : "Price index (median SAR)"}
              </h2>
              <ul className="m-0 list-none p-0">
                {(data.priceIndex || []).map((p) => (
                  <li key={p.query} className="border-b border-border px-3 py-2 text-sm">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span>{p.label || p.query}</span>
                      <span>
                        {p.medianUnitSar != null ? `${p.medianUnitSar} SAR` : "—"}
                        {p.changePct != null ? ` (${p.changePct > 0 ? "+" : ""}${p.changePct}%)` : ""}
                        {p.sampleSize ? ` · n=${p.sampleSize}` : ""}
                      </span>
                    </div>
                  </li>
                ))}
                {!data.priceIndex?.length ? (
                  <li className="px-3 py-6 text-sm text-muted">
                    {isAr ? "لا عينات كافية بعد." : "Not enough quote samples yet."}
                  </li>
                ) : null}
              </ul>
            </section>
          </div>
        </>
      ) : null}
      </PlanGate>
    </SellerShell>
  );
}
