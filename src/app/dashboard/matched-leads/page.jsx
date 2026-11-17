"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SellerShell } from "@/components/layout/SellerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { apiGet } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

export default function MatchedLeadsPage() {
  const [rfqs, setRfqs] = useState([]);
  const [planKey, setPlanKey] = useState("free");
  const [quota, setQuota] = useState(5);
  const [leadsMode, setLeadsMode] = useState("standard");
  const [priority, setPriority] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet("/api/rfqs?scope=vendor"),
      apiGet("/api/monetisation?resource=me"),
    ])
      .then(([rfqRes, entRes]) => {
        setRfqs(rfqRes.json?.success && Array.isArray(rfqRes.json.data) ? rfqRes.json.data : []);
        if (entRes.json?.success && entRes.json.data) {
          const e = entRes.json.data;
          setPlanKey(e.planKey || "free");
          setQuota(e.entitlements?.matchedLeadsPerMonth ?? 5);
          setLeadsMode(e.entitlements?.leadsMode || "standard");
          setPriority(Boolean(e.entitlements?.priorityLabelled));
        }
      })
      .catch((e) => setError(e.message || "Failed"))
      .finally(() => setLoading(false));
  }, []);

  const used = rfqs.length;
  const remaining = Math.max(0, quota - used);

  return (
    <SellerShell title="Matched leads">
      <PageHeader
        title="Guaranteed matched leads"
        subtitle={`Plan allocation for RFQ invites. Current: ${planKey} · mode: ${leadsMode}${
          priority ? " · priority (labelled)" : ""
        }.`}
        actions={
          <Link href="/dashboard/pricing" className="rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-white">
            Upgrade for more
          </Link>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="m-0 text-[10px] uppercase text-muted">Quota / month</p>
          <p className="mt-1 mb-0 text-2xl font-semibold">{quota}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="m-0 text-[10px] uppercase text-muted">Matched / invited</p>
          <p className="mt-1 mb-0 text-2xl font-semibold">{used}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="m-0 text-[10px] uppercase text-muted">Remaining</p>
          <p className="mt-1 mb-0 text-2xl font-semibold">{remaining}</p>
        </div>
      </div>

      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : rfqs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
          No matched RFQ invites yet. When buyers invite your category, they appear here and count toward your plan.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/20 text-left text-xs uppercase text-muted">
              <tr>
                <th className="p-3">RFQ</th>
                <th className="p-3">Status</th>
                <th className="p-3">When</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {rfqs.map((r) => (
                <tr key={r._id} className="border-t border-border">
                  <td className="p-3 font-medium">
                    {r.title?.en || r.title || "RFQ"}
                    {priority ? (
                      <span className="ms-2 rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-semibold text-gold">
                        priority
                      </span>
                    ) : null}
                  </td>
                  <td className="p-3 capitalize text-muted">{r.status || "—"}</td>
                  <td className="p-3 text-xs text-muted">{r.createdAt ? formatDate(r.createdAt) : "—"}</td>
                  <td className="p-3 text-right">
                    <Link href={`/dashboard/rfqs/${r._id}`} className="text-xs font-semibold text-gold">
                      Open
                    </Link>
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
