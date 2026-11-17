"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { SellerShell } from "@/components/layout/SellerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { apiGet } from "@/lib/api-client";
import { localized, formatDate } from "@/lib/utils";

export default function RfqDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet(`/api/rfqs?id=${encodeURIComponent(String(id))}`)
      .then(({ json }) => {
        if (!json.success) throw new Error(json.message || "Not found");
        setData(json.data);
      })
      .catch((e) => setError(e.message || "Failed — you may not be invited to this RFQ"))
      .finally(() => setLoading(false));
  }, [id]);

  const rfq = data?.rfq || data;

  return (
    <SellerShell title="RFQ detail">
      <PageHeader
        title={localized(rfq?.title, "RFQ")}
        subtitle="Only invited sellers can open this record (server-enforced)."
        actions={
          <div className="flex gap-2">
            <button type="button" className="btn-outline" onClick={() => router.push("/dashboard/rfqs")}>
              Inbox
            </button>
            <Link href={`/dashboard/quotations?rfqId=${id}`} className="btn-primary">
              Prepare quotation
            </Link>
          </div>
        }
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {loading ? <p className="text-muted">Loading…</p> : null}
      {rfq && !error ? (
        <div className="space-y-3 rounded-xl border border-border bg-card p-5">
          <div className="rounded-lg border border-gold/40 bg-gold-muted/40 px-3 py-2.5">
            <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-gold">
              Lead from Hukum
            </p>
            <p className="mt-1 mb-0 text-xs text-muted">
              Marketplace RFQ invite · ID <strong className="text-text">{String(rfq._id).slice(-8)}</strong>
              {rfq.buyerId?.name || rfq.buyerId?.email
                ? ` · buyer ${rfq.buyerId.name || rfq.buyerId.email}`
                : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge value={rfq.status} />
            {data?.inviteStatus ? (
              <span className="rounded-full bg-gold-muted px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold">
                Invite: {data.inviteStatus}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-muted">
            Deadline: {formatDate(rfq.deadline)} · Opening this page marks invite as viewed (Journey 4).
          </p>
          <p className="text-sm text-muted">
            City: {rfq.deliveryLocation?.city || "—"} · Budget:{" "}
            {rfq.budget != null ? `${rfq.currency || "SAR"} ${rfq.budget}` : "—"}
            {rfq.deliveryLocation?.address ? ` · ${rfq.deliveryLocation.address}` : ""}
          </p>
          <p className="text-sm">{localized(rfq.description, "No description")}</p>
          {Array.isArray(rfq.items) && rfq.items.length ? (
            <ul className="space-y-2 text-sm">
              {rfq.items.map((item, i) => (
                <li key={i} className="rounded-lg border border-border px-3 py-2">
                  {localized(item.name, "Item")} · qty {item.quantity ?? "—"} {item.unit || ""}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </SellerShell>
  );
}
