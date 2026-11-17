"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SellerShell } from "@/components/layout/SellerShell";
import { PageHeader } from "@/components/ui/PageHeader";

const KEY = "kt_seller_quote_templates_v1";

const DEFAULTS = [
  {
    id: "std",
    name: "Standard SAR quote",
    leadTime: "14 days",
    validityDays: 14,
    paymentTerms: "Net 30",
    notes: "Prices exclude 15% VAT unless stated. Not a binding offer via Hukum.",
    vatIncluded: false,
  },
  {
    id: "vat_incl",
    name: "VAT-inclusive",
    leadTime: "10 days",
    validityDays: 7,
    paymentTerms: "50% advance",
    notes: "Prices include 15% VAT. Delivery within KSA.",
    vatIncluded: true,
  },
];

export default function QuoteTemplatesPage() {
  const [templates, setTemplates] = useState(DEFAULTS);
  const [name, setName] = useState("");
  const [leadTime, setLeadTime] = useState("14 days");
  const [notes, setNotes] = useState("");
  const [vatIncluded, setVatIncluded] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) setTemplates(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  function saveAll(next) {
    setTemplates(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }

  function add(e) {
    e.preventDefault();
    if (!name.trim()) return;
    const next = [
      ...templates,
      {
        id: `t_${Date.now()}`,
        name: name.trim(),
        leadTime,
        validityDays: 14,
        paymentTerms: "Net 30",
        notes,
        vatIncluded,
      },
    ];
    saveAll(next);
    setName("");
    setNotes("");
    setMsg("Template saved — apply from Quote builder.");
  }

  function remove(id) {
    saveAll(templates.filter((t) => t.id !== id));
  }

  function useTemplate(t) {
    try {
      sessionStorage.setItem("kt_quote_template_apply", JSON.stringify(t));
      setMsg(`Template “${t.name}” ready — open Quotations to apply.`);
    } catch {
      setMsg("Could not stage template");
    }
  }

  return (
    <SellerShell title="Quote templates">
      <PageHeader
        title="Quote builder & templates"
        subtitle="Reusable quote defaults. AI drafts never auto-send — you submit."
        actions={
          <Link href="/dashboard/quotations" className="btn-primary">
            Open quote builder
          </Link>
        }
      />
      {msg ? <p className="mb-3 text-sm text-gold">{msg}</p> : null}

      <form onSubmit={add} className="mb-6 max-w-xl space-y-3 rounded-xl border border-border bg-card p-4">
        <input
          className="input-field"
          placeholder="Template name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input className="input-field" value={leadTime} onChange={(e) => setLeadTime(e.target.value)} />
        <textarea className="input-field" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" />
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={vatIncluded} onChange={(e) => setVatIncluded(e.target.checked)} />
          Prices include 15% VAT
        </label>
        <button type="submit" className="btn-primary">
          Save template
        </button>
      </form>

      <div className="grid gap-3">
        {templates.map((t) => (
          <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-4">
            <div>
              <p className="m-0 font-semibold">{t.name}</p>
              <p className="m-0 mt-1 text-xs text-muted">
                {t.leadTime} · {t.paymentTerms} · VAT {t.vatIncluded ? "incl." : "excl."}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-outline text-xs" onClick={() => useTemplate(t)}>
                Use
              </button>
              <button type="button" className="btn-outline text-xs text-danger" onClick={() => remove(t.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </SellerShell>
  );
}
