"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Plus, Trash2 } from "lucide-react";
import { SellerShell } from "@/components/layout/SellerShell";
import { EmptyState } from "@/components/ui/EmptyState";

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

const EMPTY_FORM = {
  name: "",
  leadTime: "14 days",
  validityDays: 14,
  paymentTerms: "Net 30",
  notes: "",
  vatIncluded: false,
};

export default function QuoteTemplatesPage() {
  const [templates, setTemplates] = useState(DEFAULTS);
  const [form, setForm] = useState(EMPTY_FORM);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

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

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function add(e) {
    e.preventDefault();
    setError("");
    setMsg("");
    if (!form.name.trim()) {
      setError("Give the template a name.");
      return;
    }
    const next = [
      ...templates,
      {
        id: `t_${Date.now()}`,
        name: form.name.trim(),
        leadTime: form.leadTime.trim() || "14 days",
        validityDays: Number(form.validityDays) || 14,
        paymentTerms: form.paymentTerms.trim() || "Net 30",
        notes: form.notes.trim(),
        vatIncluded: Boolean(form.vatIncluded),
      },
    ];
    saveAll(next);
    setForm(EMPTY_FORM);
    setMsg("Template saved — use it from the quote builder.");
  }

  function remove(id) {
    if (!window.confirm("Delete this template?")) return;
    saveAll(templates.filter((t) => t.id !== id));
    setMsg("Template deleted.");
  }

  function useTemplate(t) {
    try {
      sessionStorage.setItem("kt_quote_template_apply", JSON.stringify(t));
      setMsg(`“${t.name}” is ready — open Quotations to apply it.`);
    } catch {
      setError("Could not stage template on this device.");
    }
  }

  return (
    <SellerShell title="Quote templates">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="m-0 text-sm text-muted">
            Reusable quote defaults. AI drafts never auto-send — you submit.
          </p>
        </div>
        <Link href="/dashboard/quotations" className="btn-primary">
          Open quote builder
        </Link>
      </div>

      {msg ? <p className="mb-3 text-sm text-gold">{msg}</p> : null}
      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
        <form onSubmit={add} className="card space-y-4 p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-muted text-gold">
              <Plus size={16} />
            </span>
            <div>
              <h2 className="m-0 text-base font-semibold text-text">New template</h2>
              <p className="m-0 text-xs text-muted">Saved on this browser for quick quoting.</p>
            </div>
          </div>

          <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
            Template name
            <input
              className="input-field mt-1.5"
              placeholder="e.g. Express delivery quote"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
              Lead time
              <input
                className="input-field mt-1.5"
                value={form.leadTime}
                onChange={(e) => setField("leadTime", e.target.value)}
                placeholder="14 days"
              />
            </label>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
              Validity (days)
              <input
                className="input-field mt-1.5"
                type="number"
                min={1}
                value={form.validityDays}
                onChange={(e) => setField("validityDays", e.target.value)}
              />
            </label>
          </div>

          <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
            Payment terms
            <input
              className="input-field mt-1.5"
              value={form.paymentTerms}
              onChange={(e) => setField("paymentTerms", e.target.value)}
              placeholder="Net 30"
            />
          </label>

          <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
            Notes
            <textarea
              className="input-field mt-1.5 min-h-[5.5rem]"
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="VAT, delivery, warranty…"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={form.vatIncluded}
              onChange={(e) => setField("vatIncluded", e.target.checked)}
            />
            Prices include 15% VAT
          </label>

          <button type="submit" className="btn-primary w-full sm:w-auto">
            Save template
          </button>
        </form>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="m-0 text-base font-semibold text-text">Your templates</h2>
            <span className="text-xs text-muted">{templates.length} saved</span>
          </div>

          {templates.length === 0 ? (
            <EmptyState title="No templates yet" body="Create one on the left to reuse lead time and payment terms." />
          ) : (
            templates.map((t) => (
              <article key={t.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold-muted text-gold">
                        <FileText size={15} />
                      </span>
                      <p className="m-0 truncate text-sm font-semibold text-text">{t.name}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="chip">{t.leadTime || "—"}</span>
                      <span className="chip">{t.paymentTerms || "—"}</span>
                      <span className="chip">{t.validityDays || 14} days valid</span>
                      <span className={`chip ${t.vatIncluded ? "chip--ok" : ""}`}>
                        VAT {t.vatIncluded ? "included" : "excluded"}
                      </span>
                    </div>
                    {t.notes ? (
                      <p className="mt-3 mb-0 text-xs leading-relaxed text-muted">{t.notes}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" className="btn-primary !px-3 !py-2 !text-xs" onClick={() => useTemplate(t)}>
                      Use
                    </button>
                    <button
                      type="button"
                      className="btn-outline !px-3 !py-2 !text-xs text-danger"
                      onClick={() => remove(t.id)}
                      aria-label={`Delete ${t.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </SellerShell>
  );
}
