"use client";

import { useEffect, useMemo, useState } from "react";
import { SellerShell } from "@/components/layout/SellerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchVendorInquiries, updateInquiryStatus } from "@/services/inquiries-api";
import { formatDate } from "@/lib/utils";

export default function SellerInquiriesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setItems(await fetchVendorInquiries());
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
    if (!q.trim()) return items;
    const needle = q.trim().toLowerCase();
    return items.filter((row) => {
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
  }, [items, q]);

  const active = selected ? items.find((i) => String(i._id) === selected) : null;

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
      <PageHeader
        title="Buyer inquiries"
        subtitle="Order requests and product interest (OTP-verified phone) from your listings."
        actions={
          <button type="button" className="btn-outline" onClick={load} disabled={loading}>
            Refresh
          </button>
        }
      />

      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
      {message ? <p className="mb-3 text-sm text-gold">{message}</p> : null}

      <input
        className="input-field mb-4 max-w-sm"
        placeholder="Search name, phone, product…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : visible.length === 0 ? (
        <EmptyState
          title="No inquiries yet"
          body="When a buyer taps Interested (heart) or sends a request on your product page, it appears here."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <ul className="m-0 list-none space-y-2 p-0">
            {visible.map((row) => {
              const id = String(row._id);
              const activeRow = selected === id;
              const isInterest = row.extras?.requestType === "product_interest";
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => setSelected(id)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                      activeRow ? "border-gold bg-gold-muted" : "border-border bg-card hover:border-gold/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="m-0 truncate text-sm font-semibold text-text">
                            {row.extras?.productName || row.subject}
                          </p>
                          {isInterest ? (
                            <span className="rounded-full bg-[#e8f6ee] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#1f7a45]">
                              Interested
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 mb-0 text-xs text-muted">
                          {isInterest ? "OTP-verified buyer" : `${row.fullName} · ${row.companyName}`}
                        </p>
                        <p className="mt-0.5 mb-0 text-xs text-gold">{row.phone || "No phone"}</p>
                      </div>
                      <StatusBadge value={row.status || "new"} />
                    </div>
                    <p className="mt-2 mb-0 text-xs text-muted">
                      {row.reference} · {formatDate(row.createdAt)}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>

          <section className="rounded-xl border border-border bg-card p-5">
            {!active ? (
              <p className="m-0 text-sm text-muted">Select an inquiry to view details.</p>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="rounded-lg border border-gold/40 bg-gold-muted/40 px-3 py-2.5">
                  <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-gold">
                    Lead from Hukum
                  </p>
                  <p className="mt-1 mb-0 text-xs text-muted">
                    Marketplace-sourced {active.extras?.requestType === "product_interest" ? "product interest" : "inquiry"}{" "}
                    · Ref <strong className="text-text">{active.reference || "—"}</strong>
                    {active.source ? ` · source ${active.source}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="m-0 text-lg font-semibold text-text">{active.extras?.productName || active.subject}</h2>
                  <div className="flex items-center gap-2">
                    {active.extras?.requestType === "product_interest" ? (
                      <span className="rounded-full bg-[#e8f6ee] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#1f7a45]">
                        Interested
                      </span>
                    ) : null}
                    <StatusBadge value={active.status || "new"} />
                  </div>
                </div>
                <p className="m-0 text-muted">Ref {active.reference}</p>
                {active.extras?.phoneVerified ? (
                  <p className="m-0 text-xs font-medium text-[#1f7a45]">Phone verified via OTP</p>
                ) : null}
                <dl className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted">Buyer</dt>
                    <dd className="m-0 text-text">{active.fullName || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted">Company</dt>
                    <dd className="m-0 text-text">{active.companyName || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted">Phone</dt>
                    <dd className="m-0">
                      <a className="text-gold hover:underline" href={`tel:${active.phone}`}>
                        {active.phone || "—"}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted">Email</dt>
                    <dd className="m-0">
                      <a className="text-gold hover:underline" href={`mailto:${active.email}`}>
                        {active.email || "—"}
                      </a>
                    </dd>
                  </div>
                  {active.extras?.productSku ? (
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted">SKU</dt>
                      <dd className="m-0 text-text">{active.extras.productSku}</dd>
                    </div>
                  ) : null}
                  {active.extras?.vendorName ? (
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted">Seller</dt>
                      <dd className="m-0 text-text">{active.extras.vendorName}</dd>
                    </div>
                  ) : null}
                  {active.extras?.quantity ? (
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted">Quantity</dt>
                      <dd className="m-0 text-text">{active.extras.quantity}</dd>
                    </div>
                  ) : null}
                  {active.extras?.deliveryLocation ? (
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-muted">Delivery</dt>
                      <dd className="m-0 text-text">{active.extras.deliveryLocation}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted">Received</dt>
                    <dd className="m-0 text-text">{formatDate(active.createdAt)}</dd>
                  </div>
                </dl>
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wide text-muted">Message</p>
                  <pre className="m-0 whitespace-pre-wrap rounded-lg border border-border bg-surface p-3 text-sm text-text">
                    {active.message}
                  </pre>
                </div>
                <div className="flex flex-wrap gap-2 border-t border-border pt-3">
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
