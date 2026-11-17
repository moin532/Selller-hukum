"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SellerShell } from "@/components/layout/SellerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { apiGet, apiPost } from "@/lib/api-client";

export default function PartnerServicesPage() {
  const [services, setServices] = useState([]);
  const [disclaimer, setDisclaimer] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    apiGet("/api/monetisation?resource=partner_services")
      .then(({ json }) => {
        if (json.success) {
          setServices(json.data?.services || []);
          setDisclaimer(json.data?.disclaimer || "");
        }
      })
      .catch(() => undefined);
  }, []);

  async function expressInterest(key) {
    setBusy(key);
    setMsg("");
    try {
      const { json } = await apiPost("/api/monetisation", {
        action: "partner_interest",
        service: key,
      });
      if (!json.success) throw new Error(json.message);
      setMsg(`Interest recorded for ${key} (2029+ upside — not in base plan).`);
    } catch (e) {
      setMsg(e.message || "Failed");
    } finally {
      setBusy("");
    }
  }

  return (
    <SellerShell title="Partner services">
      <PageHeader
        title="Partner services (2029+ upside)"
        subtitle="Kept out of the base financial plan. Subscriptions remain the committed model."
        actions={
          <Link href="/dashboard/pricing" className="rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-white">
            View subscriptions
          </Link>
        }
      />

      {disclaimer ? (
        <p className="mb-6 rounded-xl border border-border bg-card p-4 text-sm text-muted">{disclaimer}</p>
      ) : null}
      {msg ? <p className="mb-3 text-sm text-gold">{msg}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <div key={s.key} className="flex flex-col rounded-xl border border-border bg-card p-4">
            <p className="m-0 text-[10px] uppercase text-muted">
              {s.horizon}
              {s.partnerLed ? " · partner-led" : ""}
            </p>
            <p className="mt-1 mb-0 font-semibold text-text">{s.name?.en || s.key}</p>
            <p className="mt-2 mb-4 flex-1 text-sm text-muted">{s.blurb?.en}</p>
            <button
              type="button"
              disabled={busy === s.key}
              onClick={() => void expressInterest(s.key)}
              className="rounded-lg border border-border px-3 py-2 text-xs font-semibold disabled:opacity-50"
            >
              {busy === s.key ? "…" : "Register interest"}
            </button>
          </div>
        ))}
      </div>
    </SellerShell>
  );
}
