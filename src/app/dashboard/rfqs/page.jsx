"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SellerShell } from "@/components/layout/SellerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchRfqDetail, fetchVendorRfqs, respondToInvitation } from "@/services/rfqs-api";
import { localized, formatDate } from "@/lib/utils";

export default function RfqsPage() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setItems(await fetchVendorRfqs());
    } catch (e) {
      setItems([]);
      setError(e.message || "Failed to load RFQs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    fetchRfqDetail(selected)
      .then(setDetail)
      .catch((e) => setError(e.message || "Detail failed"));
  }, [selected]);

  const visible = useMemo(() => {
    if (!q.trim()) return items;
    const needle = q.trim().toLowerCase();
    return items.filter((r) => localized(r.title, "").toLowerCase().includes(needle));
  }, [items, q]);

  async function respond(status) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await respondToInvitation(selected, status);
      setMessage(`Invitation → ${status} (server confirmed).`);
      setDetail(await fetchRfqDetail(selected));
    } catch (e) {
      setError(e.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SellerShell title="RFQ Invitations">
      <PageHeader
        title="RFQ Invitations"
        subtitle="Only RFQs you were invited to (GET /api/rfqs?scope=vendor). Not the full marketplace RFQ list."
      />
      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
      {message ? <p className="mb-3 text-sm text-gold">{message}</p> : null}

      <div className="mb-5 flex flex-wrap gap-3">
        <input className="input-field max-w-xs" placeholder="Filter title" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="button" className="btn-outline" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : visible.length === 0 ? (
        <EmptyState title="No invitations" body="When buyers match your vendor, invited RFQs appear here." />
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>RFQ</th>
                <th>City</th>
                <th>Deadline</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const id = String(r._id);
                return (
                  <tr key={id}>
                    <td>
                      <strong>{localized(r.title)}</strong>
                    </td>
                    <td>{r.deliveryLocation?.city || "—"}</td>
                    <td>{r.deadline ? formatDate(r.deadline) : "—"}</td>
                    <td>
                      <StatusBadge value={r.status} />
                    </td>
                    <td>
                      <button type="button" className="btn-outline" onClick={() => setSelected(id)}>
                        Open
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {detail?.rfq ? (
        <section className="mt-6 rounded-xl border border-border bg-card p-5">
          <div className="mb-4 rounded-lg border border-gold/40 bg-gold-muted/40 px-3 py-2.5">
            <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-gold">
              Lead from Hukum
            </p>
            <p className="mt-1 mb-0 text-xs text-muted">
              RFQ invitation matched via the Hukum marketplace · ID{" "}
              <strong className="text-text">{String(detail.rfq._id).slice(-8)}</strong>
              {detail.rfq.buyerId?.name || detail.rfq.buyerId?.email
                ? ` · buyer ${detail.rfq.buyerId.name || detail.rfq.buyerId.email}`
                : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="m-0 text-lg font-semibold">{localized(detail.rfq.title)}</h2>
              <p className="mt-1 text-sm text-muted">{localized(detail.rfq.description, "")}</p>
              {Array.isArray(detail.rfq.items) && detail.rfq.items.length ? (
                <ul className="mt-3 mb-0 space-y-1.5 p-0 text-sm">
                  {detail.rfq.items.map((item, i) => (
                    <li key={i} className="rounded-lg border border-border px-3 py-2">
                      {localized(item.name, "Item")} · qty {item.quantity ?? "—"} {item.unit || ""}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <button type="button" className="btn-outline" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn-outline" disabled={busy} onClick={() => respond("accepted")}>
              Accept invite
            </button>
            <button type="button" className="btn-danger" disabled={busy} onClick={() => respond("declined")}>
              Decline
            </button>
            <Link href={`/dashboard/quotations?rfqId=${selected}`} className="btn-primary">
              Prepare quotation
            </Link>
            <Link href={`/dashboard/rfqs/${selected}`} className="btn-outline">
              Full detail
            </Link>
          </div>
          {message ? (
            <p className="mt-3 mb-0 text-xs text-muted">
              Buyer is notified in-app when you accept, decline, or submit a quotation.
            </p>
          ) : null}
        </section>
      ) : null}
    </SellerShell>
  );
}
