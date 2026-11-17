"use client";

import { useEffect, useState } from "react";
import { SellerShell } from "@/components/layout/SellerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { PlanGate } from "@/components/billing/PlanGate";
import { apiGet } from "@/lib/api-client";

/**
 * Companies that viewed you — only with consent / reveal events (PDPL).
 */
export default function ViewersPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet("/api/seller-analytics?range=30d&granularity=day&compare=0")
      .then(({ json }) => {
        if (!json.success) throw new Error(json.message || "Failed");
        const events = json.data?.recentEvents || json.data?.contactEvents || json.data?.reveals || [];
        const list = Array.isArray(events)
          ? events
          : Array.isArray(json.data?.kpis?.recentReveals)
            ? json.data.kpis.recentReveals
            : [];
        // Normalize from analytics rollup if present
        const fromRollup = [];
        if (json.data?.tables?.contactReveals) {
          for (const r of json.data.tables.contactReveals) {
            fromRollup.push({
              company: r.company || r.buyer || "Buyer (consented)",
              product: r.product || "—",
              at: r.at || r.createdAt,
              channel: r.channel || "reveal",
            });
          }
        }
        if (fromRollup.length) setRows(fromRollup);
        else if (list.length) {
          setRows(
            list.map((e) => ({
              company: e.company || e.meta?.company || e.buyerName || "Buyer (consented)",
              product: e.product || e.meta?.productName || "—",
              at: e.at || e.createdAt,
              channel: e.type || e.channel || "view/reveal",
            }))
          );
        } else {
          setRows([]);
        }
      })
      .catch((e) => setError(e.message || "Failed"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SellerShell title="Viewers">
      <PageHeader
        title="Companies that viewed you"
        subtitle="Shown only when buyers consented to reveal / unlock contact (PDPL). Anonymous browse stays anonymous."
      />
      <PlanGate feature="viewersConsent" minPlan="premium">
      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
      {loading ? <p className="text-muted">Loading…</p> : null}
      {!loading && rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
          No consented viewers yet. When a buyer unlocks contact on your listing, they appear here.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/20 text-left text-xs uppercase text-muted">
              <tr>
                <th className="p-3">Company / buyer</th>
                <th className="p-3">Product</th>
                <th className="p-3">Channel</th>
                <th className="p-3">When</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="p-3 font-medium">{r.company}</td>
                  <td className="p-3 text-muted">{r.product}</td>
                  <td className="p-3 text-muted">{r.channel}</td>
                  <td className="p-3 text-muted">{r.at ? new Date(r.at).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </PlanGate>
    </SellerShell>
  );
}
