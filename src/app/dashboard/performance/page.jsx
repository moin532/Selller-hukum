"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SellerShell } from "@/components/layout/SellerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { apiGet } from "@/lib/api-client";
import { fetchMyQuotations } from "@/services/quotations-api";
import { fetchVendorInquiries } from "@/services/inquiries-api";

export default function MonthlyPerformancePage() {
  const [quotes, setQuotes] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetchMyQuotations().catch(() => []),
      fetchVendorInquiries().catch(() => []),
      apiGet("/api/seller-analytics?range=30d&granularity=day&compare=0").then((r) => r.json).catch(() => null),
    ])
      .then(([q, i, a]) => {
        setQuotes(Array.isArray(q) ? q : []);
        setInquiries(Array.isArray(i) ? i : []);
        if (a?.success) setAnalytics(a.data);
      })
      .catch((e) => setError(e.message || "Failed"));
  }, []);

  const report = useMemo(() => {
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentQ = quotes.filter((q) => new Date(q.createdAt || 0).getTime() >= monthAgo);
    const won = recentQ.filter((q) => ["accepted", "deal_confirmed", "reviewed"].includes(q.status));
    const pipeline = recentQ.reduce((s, q) => s + (Number(q.total) || 0), 0);
    const wonValue = won.reduce((s, q) => s + (Number(q.total) || 0), 0);
    const recentInq = inquiries.filter((x) => new Date(x.createdAt || 0).getTime() >= monthAgo);
    return {
      quotes: recentQ.length,
      won: won.length,
      winRate: recentQ.length ? Math.round((won.length / recentQ.length) * 100) : 0,
      pipeline,
      wonValue,
      inquiries: recentInq.length,
      views: analytics?.kpis?.profileViews || analytics?.totals?.views || "—",
    };
  }, [quotes, inquiries, analytics]);

  return (
    <SellerShell title="Performance">
      <PageHeader
        title="Monthly performance report"
        subtitle="Last 30 days: quotes, win rate, pipeline, and inquiries."
        actions={
          <Link href="/dashboard/analytics" className="rounded-lg border border-border px-3 py-2 text-sm font-semibold">
            Full analytics
          </Link>
        }
      />
      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["Quotes sent", report.quotes],
          ["Wins", report.won],
          ["Win rate", `${report.winRate}%`],
          ["Pipeline (SAR)", report.pipeline.toLocaleString()],
          ["Won value (SAR)", report.wonValue.toLocaleString()],
          ["Inquiries", report.inquiries],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <p className="m-0 text-[10px] uppercase text-muted">{label}</p>
            <p className="mt-1 mb-0 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted">
        Report generated {new Date().toLocaleString()} · Export PDF / email digest connects in a later release.
      </p>
    </SellerShell>
  );
}
