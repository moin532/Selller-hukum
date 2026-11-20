"use client";

import { useEffect, useMemo, useState } from "react";
import { Inbox, Phone, RefreshCw, Search } from "lucide-react";
import { SellerShell } from "@/components/layout/SellerShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchVendorInquiries, updateInquiryStatus } from "@/services/inquiries-api";
import { formatDate } from "@/lib/utils";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "reviewing", label: "Reviewing" },
  { id: "replied", label: "Replied" },
  { id: "closed", label: "Closed" },
];

export default function SellerInquiriesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const rows = await fetchVendorInquiries();
      setItems(rows);
      setSelected((prev) => {
        if (prev && rows.some((r) => String(r._id) === prev)) return prev;
        return rows[0] ? String(rows[0]._id) : null;
      });
    } catch (e) {
      setItems([]);
      setError(e.message || "Failed to load inquiries");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    let rows = items;
    if (filter !== "all") {
      rows = rows.filter((r) => String(r.status || "new").toLowerCase() === filter);
    }
    if (!q.trim()) return rows;
    const needle = q.trim().toLowerCase();
    return rows.filter((row) => {
      const blob = [
        row.fullName,
        row.companyName,
        row.phone,
        row.email,
        row.subject,
        row.extras?.productName,
        row.reference,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(needle);
    });
  }, [items, q, filter]);

  const active = selected ? items.find((i) => String(i._id) === selected) : null;
  const counts = useMemo(() => {
    const c = { all: items.length, new: 0, reviewing: 0, replied: 0, closed: 0 };
    for (const row of items) {
      const s = String(row.status || "new").toLowerCase();
      if (c[s] != null) c[s] += 1;
    }
    return c;
  }, [items]);

  async function setStatus(status) {
    if (!selected) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await updateInquiryStatus(selected, status);
      setMessage(`Marked as ${status}`);
      await load();
    } catch (e) {
      setError(e.message || "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SellerShell title="Buyer inquiries">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="m-0 text-sm text-muted">
            Order requests and product interest from your listings.
          </p>
          <p className="mt-1 mb-0 text-xs text-muted">{counts.all} total leads</p>
        </div>
        <button type="button" className="btn-outline inline-flex items-center gap-2" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
      {message ? <p className="mb-3 text-sm text-gold">{message}</p> : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              filter === f.id
                ? "border-gold bg-gold-muted text-gold"
                : "border-border bg-card text-muted hover:text-text"
            }`}
          >
            {f.label}
            <span className="ms-1.5 opacity-70">{counts[f.id] ?? 0}</span>
          </button>
        ))}
        <div className="relative ms-auto w-full sm:w-72">
          <Search size={14} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="input-field ps-9"
            placeholder="Search name, phone, product…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-muted">Loading inquiries…</div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No inquiries yet"
          body="When a buyer taps Interested or sends a request on your product page, it appears here."
        />
      ) : visible.length === 0 ? (
        <EmptyState title="No matches" body="Try another search or status filter." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
          <ul className="m-0 max-h-[70vh] list-none space-y-2 overflow-y-auto p-0 pe-1">
            {visible.map((row) => {
              const id = String(row._id);
              const activeRow = selected === id;
              const isInterest = row.extras?.requestType === "product_interest";
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => setSelected(id)}
                    className={`w-full rounded-[var(--radius-md)] border px-4 py-3 text-left transition ${
                      activeRow
                        ? "border-gold bg-gold-muted shadow-[var(--shadow-card)]"
                        : "border-border bg-card hover:border-gold/35"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="m-0 truncate text-sm font-semibold text-text">
                            {row.extras?.productName || row.subject || "Inquiry"}
                          </p>
                          {isInterest ? (
                            <span className="chip chip--ok">Interested</span>
                          ) : null}
                        </div>
                        <p className="mt-1 mb-0 truncate text-xs text-muted">
                          {isInterest
                            ? "OTP-verified buyer"
                            : [row.fullName, row.companyName].filter(Boolean).join(" · ") || "Buyer"}
                        </p>
                        <p className="mt-1 mb-0 inline-flex items-center gap-1 text-xs font-medium text-gold">
                          <Phone size={12} />
                          {row.phone || "No phone"}
                        </p>
                      </div>
                      <StatusBadge value={row.status || "new"} />
                    </div>
                    <p className="mt-2 mb-0 text-[11px] text-muted">
                      {row.reference} · {formatDate(row.createdAt)}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>

          <section className="card sticky top-20 min-h-[28rem] p-5 lg:p-6">
            {!active ? (
              <div className="flex h-full min-h-[24rem] flex-col items-center justify-center gap-3 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-muted text-gold">
                  <Inbox size={22} />
                </span>
                <p className="m-0 text-sm font-semibold text-text">Select an inquiry</p>
                <p className="m-0 max-w-xs text-xs text-muted">
                  Pick a lead on the left to see buyer details and update its status.
                </p>
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                <div className="rounded-[var(--radius-md)] border border-gold/30 bg-gold-muted/50 px-3.5 py-3">
                  <p className="m-0 text-[10px] font-bold uppercase tracking-[0.12em] text-gold">
                    Lead from Hukum
                  </p>
                  <p className="mt-1 mb-0 text-xs text-muted">
                    {active.extras?.requestType === "product_interest"
                      ? "Product interest"
                      : "Buyer inquiry"}
                    {" · "}
                    Ref <strong className="text-text">{active.reference || "—"}</strong>
                    {active.source ? ` · ${active.source}` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="m-0 text-xl font-semibold tracking-tight text-text">
                    {active.extras?.productName || active.subject || "Inquiry"}
                  </h2>
                  <div className="flex items-center gap-2">
                    {active.extras?.requestType === "product_interest" ? (
                      <span className="chip chip--ok">Interested</span>
                    ) : null}
                    <StatusBadge value={active.status || "new"} />
                  </div>
                </div>

                {active.extras?.phoneVerified ? (
                  <p className="m-0 text-xs font-medium text-success">Phone verified via OTP</p>
                ) : null}

                <dl className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border bg-surface/60 p-3">
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">Buyer</dt>
                    <dd className="m-0 mt-1 text-text">{active.fullName || "—"}</dd>
                  </div>
                  <div className="rounded-lg border border-border bg-surface/60 p-3">
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">Company</dt>
                    <dd className="m-0 mt-1 text-text">{active.companyName || "—"}</dd>
                  </div>
                  <div className="rounded-lg border border-border bg-surface/60 p-3">
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">Phone</dt>
                    <dd className="m-0 mt-1">
                      {active.phone ? (
                        <a className="font-medium text-gold hover:underline" href={`tel:${active.phone}`}>
                          {active.phone}
                        </a>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-border bg-surface/60 p-3">
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">Email</dt>
                    <dd className="m-0 mt-1">
                      {active.email ? (
                        <a className="font-medium text-gold hover:underline" href={`mailto:${active.email}`}>
                          {active.email}
                        </a>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                  {active.extras?.productSku ? (
                    <div className="rounded-lg border border-border bg-surface/60 p-3">
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">SKU</dt>
                      <dd className="m-0 mt-1 text-text">{active.extras.productSku}</dd>
                    </div>
                  ) : null}
                  {active.extras?.quantity ? (
                    <div className="rounded-lg border border-border bg-surface/60 p-3">
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">Quantity</dt>
                      <dd className="m-0 mt-1 text-text">{active.extras.quantity}</dd>
                    </div>
                  ) : null}
                  {active.extras?.deliveryLocation ? (
                    <div className="rounded-lg border border-border bg-surface/60 p-3 sm:col-span-2">
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">Delivery</dt>
                      <dd className="m-0 mt-1 text-text">{active.extras.deliveryLocation}</dd>
                    </div>
                  ) : null}
                  <div className="rounded-lg border border-border bg-surface/60 p-3 sm:col-span-2">
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">Received</dt>
                    <dd className="m-0 mt-1 text-text">{formatDate(active.createdAt)}</dd>
                  </div>
                </dl>

                {active.message ? (
                  <div>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">Message</p>
                    <pre className="m-0 whitespace-pre-wrap rounded-[var(--radius-md)] border border-border bg-surface p-3.5 text-sm leading-relaxed text-text">
                      {active.message}
                    </pre>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  <button type="button" className="btn-outline" disabled={busy} onClick={() => setStatus("reviewing")}>
                    Mark reviewing
                  </button>
                  <button type="button" className="btn-primary" disabled={busy} onClick={() => setStatus("replied")}>
                    Mark replied
                  </button>
                  <button type="button" className="btn-outline" disabled={busy} onClick={() => setStatus("closed")}>
                    Close
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </SellerShell>
  );
}
