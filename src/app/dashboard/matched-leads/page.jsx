"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SellerShell } from "@/components/layout/SellerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { apiGet } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

export default function MatchedLeadsPage() {
  const [rfqs, setRfqs] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet("/api/rfqs?scope=vendor")
      .then((rfqRes) => {
        setRfqs(rfqRes.json?.success && Array.isArray(rfqRes.json.data) ? rfqRes.json.data : []);
      })
      .catch((e) => setError(e.message || "Failed"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SellerShell title="Matched leads">
      <PageHeader
        title="Guaranteed matched leads"
        subtitle="RFQ invites matched to your catalogue."
      />

      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : rfqs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
          No matched RFQ invites yet. When buyers invite your category, they appear here.
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
                  <td className="p-3 font-medium">{r.title?.en || r.title || "RFQ"}</td>
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
