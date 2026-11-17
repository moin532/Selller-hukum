"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SellerShell } from "@/components/layout/SellerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  askQuoteAgent,
  createQuotation,
  fetchMyQuotations,
  fetchQuoteReminders,
  patchQuotation,
  withdrawQuotation,
} from "@/services/quotations-api";
import { fetchRfqDetail } from "@/services/rfqs-api";
import { formatDate, money, localized } from "@/lib/utils";
import Link from "next/link";

function QuotationsInner() {
  const searchParams = useSearchParams();
  const rfqId = searchParams.get("rfqId") || "";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [unitPrice, setUnitPrice] = useState("100");
  const [qty, setQty] = useState("1");
  const [lineName, setLineName] = useState("Quoted line");
  const [leadTime, setLeadTime] = useState("14 days");
  const [notes, setNotes] = useState("");
  const [vatIncluded, setVatIncluded] = useState(true);
  const [validityDays, setValidityDays] = useState("14");
  const [reminders, setReminders] = useState([]);
  const [rfqMeta, setRfqMeta] = useState(null);

  const previewQty = Number(qty) || 1;
  const previewPrice = Number(unitPrice) || 0;
  const previewSubtotal = Math.round(previewQty * previewPrice * 100) / 100;
  const previewTax = vatIncluded
    ? Math.round((previewSubtotal / 1.15) * 0.15 * 100) / 100
    : Math.round(previewSubtotal * 0.15 * 100) / 100;
  const previewTotal = vatIncluded ? previewSubtotal : Math.round((previewSubtotal + previewTax) * 100) / 100;

  async function load() {
    setLoading(true);
    setError("");
    try {
      setItems(await fetchMyQuotations());
      try {
        const rem = await fetchQuoteReminders("en");
        setReminders(Array.isArray(rem?.reminders) ? rem.reminders : []);
      } catch {
        setReminders([]);
      }
    } catch (e) {
      setItems([]);
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!rfqId) {
      setRfqMeta(null);
      return;
    }
    let cancelled = false;
    fetchRfqDetail(rfqId)
      .then((data) => {
        if (cancelled) return;
        const rfq = data?.rfq || data;
        setRfqMeta(rfq);
        const item = Array.isArray(rfq?.items) && rfq.items[0] ? rfq.items[0] : null;
        const q =
          item?.quantity ??
          rfq?.quantity ??
          null;
        if (q != null) setQty(String(q));
        if (item?.name) setLineName(localized(item.name, "Quoted line"));
        if (item?.targetPrice != null) setUnitPrice(String(item.targetPrice));
        else if (rfq?.budget != null && q) {
          setUnitPrice(String(Math.round((Number(rfq.budget) / Number(q)) * 100) / 100));
        }
      })
      .catch(() => {
        if (!cancelled) setRfqMeta(null);
      });
    return () => {
      cancelled = true;
    };
  }, [rfqId]);

  const visible = useMemo(() => {
    if (!rfqId) return items;
    return items.filter((q) => {
      const id = typeof q.rfqId === "object" ? String(q.rfqId?._id || "") : String(q.rfqId || "");
      return id === rfqId;
    });
  }, [items, rfqId]);

  async function onCreate(e) {
    e.preventDefault();
    if (!rfqId) {
      setError("Open an invited RFQ and use Prepare quotation so rfqId is set.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const quantity = Number(qty) || 1;
      const price = Number(unitPrice) || 0;
      const days = Math.max(1, Number(validityDays) || 14);
      const validity = new Date();
      validity.setDate(validity.getDate() + days);
      const lineTotal = Math.round(quantity * price * 100) / 100;
      const tax = vatIncluded
        ? Math.round((lineTotal / 1.15) * 0.15 * 100) / 100
        : Math.round(lineTotal * 0.15 * 100) / 100;
      const created = await createQuotation({
        rfqId,
        lines: [{ name: lineName || "Quoted line", quantity, unitPrice: price, total: lineTotal }],
        currency: "SAR",
        tax,
        shipping: 0,
        leadTime,
        notes,
        validity: validity.toISOString(),
        status: "submitted",
        vatIncluded,
      });
      const hijri = created?.validityHijri ? ` · Hijri ${created.validityHijri}` : "";
      setMessage(
        `Quotation submitted · total ${money(created?.total ?? (vatIncluded ? lineTotal : lineTotal + tax), "SAR")}${
          vatIncluded ? ` (incl. VAT ${tax})` : ` (excl. VAT +${tax})`
        } · valid ${days}d${hijri}. Not a binding offer via Hukum.`
      );
      await load();
    } catch (err) {
      setError(err.message || "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function onAiDraft() {
    setBusy(true);
    setError("");
    try {
      const data = await askQuoteAgent("Draft a competitive quotation for this RFQ invite", {
        quantity: Number(qty) || 1,
        rfqId,
      });
      const d = data?.draft || {};
      if (d.unitPrice != null) setUnitPrice(String(d.unitPrice));
      if (d.quantity != null) setQty(String(d.quantity));
      if (d.leadTime) setLeadTime(String(d.leadTime));
      if (d.notes) setNotes(String(d.notes));
      setMessage(data?.reply || "AI draft applied — review before submit.");
    } catch (err) {
      setError(err.message || "AI draft failed");
    } finally {
      setBusy(false);
    }
  }

  async function onWithdraw(id) {
    setBusy(true);
    setError("");
    try {
      await withdrawQuotation(id);
      setMessage("Quotation withdrawn.");
      await load();
    } catch (err) {
      setError(err.message || "Withdraw failed");
    } finally {
      setBusy(false);
    }
  }

  async function onExtend(id) {
    setBusy(true);
    setError("");
    try {
      await patchQuotation(id, "extend_validity", { extendDays: 7 });
      setMessage("Validity extended by 7 days.");
      await load();
    } catch (err) {
      setError(err.message || "Extend failed");
    } finally {
      setBusy(false);
    }
  }

  async function onRevise(id) {
    setBusy(true);
    setError("");
    try {
      await patchQuotation(id, "revise");
      setMessage("Marked as revised — buyer notified.");
      await load();
    } catch (err) {
      setError(err.message || "Revise failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SellerShell title="Quotations">
      <PageHeader
        title="Quotations"
        subtitle="Submit quotes for invited RFQs. Use AI draft assist, then Inbox for buyer messages & reminders."
        actions={
          <div className="flex gap-2">
            <Link href="/dashboard/inbox" className="btn-outline">
              Quote inbox
            </Link>
            <button type="button" className="btn-outline" onClick={load} disabled={loading}>
              Refresh
            </button>
          </div>
        }
      />
      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
      {message ? <p className="mb-3 text-sm text-gold">{message}</p> : null}

      {reminders.length > 0 ? (
        <div className="mb-6 rounded-xl border border-border bg-card p-4">
          <p className="m-0 text-xs font-bold uppercase tracking-wide text-gold">Journey 4 reminders</p>
          <ul className="mt-2 mb-0 space-y-1.5 p-0 text-sm text-muted">
            {reminders.slice(0, 6).map((r, i) => (
              <li key={i} className="list-none">
                <span className="font-medium text-text">{r.title || r.type || "Reminder"}</span>
                {r.body ? ` — ${r.body}` : ""}
                {r.meta?.channels?.length ? ` · ${r.meta.channels.join(", ")}` : ""}
                {r.meta?.smartAction ? ` · AI: ${r.meta.smartAction}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {rfqId ? (
        <form onSubmit={onCreate} className="mb-6 max-w-xl space-y-3 rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted">
            Creating quote for RFQ <code>{rfqId.slice(-8)}</code>
          </p>
          {rfqMeta ? (
            <div className="rounded-lg border border-gold/30 bg-gold-muted/30 px-3 py-2 text-xs text-muted">
              <p className="m-0 font-medium text-text">{localized(rfqMeta.title, "RFQ")}</p>
              <p className="mt-1 mb-0">
                City: {rfqMeta.deliveryLocation?.city || "—"} · Budget:{" "}
                {rfqMeta.budget != null ? money(rfqMeta.budget, rfqMeta.currency || "SAR") : "—"} · Deadline:{" "}
                {formatDate(rfqMeta.deadline)}
              </p>
            </div>
          ) : null}
          <label className="block text-sm text-muted">
            Line name
            <input className="input-field mt-1" value={lineName} onChange={(e) => setLineName(e.target.value)} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-muted">
              Unit price (SAR)
              <input className="input-field mt-1" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
            </label>
            <label className="text-sm text-muted">
              Quantity
              <input className="input-field mt-1" value={qty} onChange={(e) => setQty(e.target.value)} />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-muted">
              Lead time
              <input className="input-field mt-1" value={leadTime} onChange={(e) => setLeadTime(e.target.value)} />
            </label>
            <label className="text-sm text-muted">
              Validity (days)
              <input
                className="input-field mt-1"
                type="number"
                min={1}
                value={validityDays}
                onChange={(e) => setValidityDays(e.target.value)}
              />
            </label>
          </div>
          <label className="block text-sm text-muted">
            Notes
            <textarea className="input-field mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={vatIncluded}
              onChange={(e) => setVatIncluded(e.target.checked)}
            />
            Prices include 15% VAT (Saudi)
          </label>
          <p className="m-0 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text">
            Total {money(previewTotal, "SAR")}
            {vatIncluded
              ? ` (incl. VAT ${money(previewTax, "SAR")})`
              : ` + VAT ${money(previewTax, "SAR")} excl.`}
          </p>
          <p className="m-0 text-xs text-muted">
            Quote builder: VAT + validity. Quotes on Hukum are not binding offers. Validity shows
            Gregorian + Hijri. Reminders respect Saudi prayer windows, 10pm quiet hours, and Fri–Sat weekends.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-outline" disabled={busy} onClick={onAiDraft}>
              {busy ? "…" : "AI draft assist"}
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? "Submitting…" : "Submit quotation"}
            </button>
          </div>
        </form>
      ) : (
        <div className="gap-banner mb-6">Select an invited RFQ and click Prepare quotation to create a quote.</div>
      )}

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : visible.length === 0 ? (
        <EmptyState title="No quotations" body="Submitted quotes for your vendor will list here." />
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>RFQ</th>
                <th>Total</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((q) => (
                <tr key={String(q._id)}>
                  <td>
                    {typeof q.rfqId === "object" ? localized(q.rfqId?.title, String(q.rfqId?._id || "").slice(-6)) : String(q.rfqId || "—").slice(-6)}
                  </td>
                  <td>{money(q.total, q.currency || "SAR")}</td>
                  <td>
                    <StatusBadge value={q.status} />
                  </td>
                  <td>{formatDate(q.createdAt)}</td>
                  <td className="space-x-1">
                    {["submitted", "draft", "clarifying", "revised", "shortlisted"].includes(q.status) ? (
                      <button
                        type="button"
                        className="btn-outline text-xs"
                        disabled={busy}
                        onClick={() => onWithdraw(String(q._id))}
                      >
                        Withdraw
                      </button>
                    ) : null}
                    {["submitted", "clarifying", "revised", "shortlisted", "expired"].includes(q.status) ? (
                      <button
                        type="button"
                        className="btn-outline text-xs"
                        disabled={busy}
                        onClick={() => onExtend(String(q._id))}
                      >
                        Extend +7d
                      </button>
                    ) : null}
                    {["submitted", "clarifying", "shortlisted"].includes(q.status) ? (
                      <button
                        type="button"
                        className="btn-outline text-xs"
                        disabled={busy}
                        onClick={() => onRevise(String(q._id))}
                      >
                        Mark revised
                      </button>
                    ) : null}
                    {!["submitted", "draft", "clarifying", "revised", "shortlisted", "expired"].includes(
                      q.status
                    )
                      ? "—"
                      : null}
                    {q.validityHijri ? (
                      <span className="block text-[10px] text-muted">Hijri {q.validityHijri}</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SellerShell>
  );
}

export default function QuotationsPage() {
  return (
    <Suspense
      fallback={
        <SellerShell title="Quotations">
          <p className="text-muted">Loading…</p>
        </SellerShell>
      }
    >
      <QuotationsInner />
    </Suspense>
  );
}
