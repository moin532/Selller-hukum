"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { SellerShell } from "@/components/layout/SellerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatGrid } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AnalyticsFilterBar } from "@/components/charts/AnalyticsFilterBar";
import { ChartCard, ChartLoadingSkeleton, ChartErrorState } from "@/components/charts/ChartCard";
import { fetchSellerAnalyticsRollup } from "@/services/analytics-api";
import { downloadCsv, pctChange, toCsv } from "@/lib/analytics";
import { formatDate } from "@/lib/utils";

const LineTrendChart = dynamic(
  () => import("@/components/charts/LineTrendChart").then((m) => m.LineTrendChart),
  { ssr: false, loading: () => <ChartLoadingSkeleton /> }
);
const DonutBreakdownChart = dynamic(
  () => import("@/components/charts/DonutBreakdownChart").then((m) => m.DonutBreakdownChart),
  { ssr: false, loading: () => <ChartLoadingSkeleton /> }
);
const BarComparisonChart = dynamic(
  () => import("@/components/charts/BarComparisonChart").then((m) => m.BarComparisonChart),
  { ssr: false, loading: () => <ChartLoadingSkeleton /> }
);
const HorizontalRankingChart = dynamic(
  () => import("@/components/charts/HorizontalRankingChart").then((m) => m.HorizontalRankingChart),
  { ssr: false, loading: () => <ChartLoadingSkeleton /> }
);

function changeHint(current, previous) {
  const pct = pctChange(current, previous);
  if (pct == null) return "vs prior period n/a";
  return `${pct > 0 ? "+" : ""}${pct}% vs prior`;
}

export default function AnalyticsPage() {
  const [range, setRange] = useState("30d");
  const [granularity, setGranularity] = useState("day");
  const [compare, setCompare] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchSellerAnalyticsRollup({ range, granularity, compare }));
    } catch (e) {
      setError(e.message || "Failed to load analytics");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [range, granularity, compare]);

  useEffect(() => {
    load();
  }, [load]);

  const k = data?.kpis;
  const prev = k?.previousPeriod;

  const cards = useMemo(() => {
    if (!k) return [];
    return [
      {
        label: "Storefront views",
        value: String(k.storefrontViews ?? (k.productViews || 0) + (k.vendorViews || 0)),
        hint: "Product + profile views (Gold signal)",
      },
      {
        label: "Product views",
        value: String(k.productViews ?? 0),
        hint: "Listing detail opens",
      },
      {
        label: "Profile views",
        value: String(k.vendorViews ?? 0),
        hint: "Storefront / vendor page",
      },
      {
        label: "Contact reveals",
        value: String(k.contactEvents ?? k.leads ?? 0),
        hint: "Reveals, inquiries, WhatsApp / phone / email",
      },
      { label: "Products", value: String(k.totalProducts), hint: "Your catalog" },
      { label: "Published", value: String(k.published), hint: "Live listings" },
      {
        label: "RFQ invitations",
        value: String(k.invitations),
        hint: changeHint(k.invitations, prev?.invitations),
      },
      {
        label: "Quotations",
        value: String(k.quotations),
        hint: changeHint(k.quotesCreated, prev?.quotations),
      },
    ];
  }, [k, prev]);

  const quoteBars = useMemo(() => {
    return (data?.quotationStatus || []).map((s) => ({ date: s.status, count: s.count }));
  }, [data]);

  function onExport() {
    if (!data?.catalogSeries?.length) return;
    const csv = toCsv(data.catalogSeries, [
      { key: "date", label: "date" },
      { key: "created", label: "products_created" },
      { key: "published", label: "products_published_created" },
    ]);
    downloadCsv(`seller-analytics-${range}.csv`, csv);
  }

  return (
    <SellerShell title="Analytics">
      <PageHeader
        title="Analytics"
        subtitle="Views, contact reveals, and response signals — scoped to your vendorId. Consented viewers: /dashboard/viewers."
      />

      <AnalyticsFilterBar
        range={range}
        granularity={granularity}
        compare={compare}
        onRange={setRange}
        onGranularity={setGranularity}
        onCompare={setCompare}
        onClear={() => {
          setRange("30d");
          setGranularity("day");
          setCompare(true);
        }}
        onExport={onExport}
        busy={loading}
      />

      {error ? <ChartErrorState message={error} /> : null}
      {loading && !data ? <ChartLoadingSkeleton height={100} /> : <StatGrid items={cards} />}

      <div className="mb-4 grid gap-4">
        <ChartCard
          title="Catalog performance"
          subtitle="Question: How is my catalog changing? Products created vs published (by createdAt)."
        >
          <LineTrendChart
            data={data?.catalogSeries || []}
            series={[
              { key: "created", label: "Created" },
              { key: "published", label: "Published (created as published)" },
            ]}
          />
        </ChartCard>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Product status"
          subtitle="Question: What is my moderation mix? Exact API statuses for your products only."
        >
          <DonutBreakdownChart data={data?.productStatus || []} />
        </ChartCard>
        <ChartCard
          title="RFQ opportunities"
          subtitle="Question: How many invitations am I receiving? Invitation vs quotation creation over time."
        >
          <LineTrendChart
            data={data?.opportunitySeries || []}
            series={[
              { key: "invitations", label: "Invitations" },
              { key: "quotations", label: "Quotations created" },
            ]}
          />
        </ChartCard>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Quotation status"
          subtitle="Snapshot of your quotation statuses (draft, submitted, accepted, rejected, withdrawn)."
        >
          <BarComparisonChart data={quoteBars} series={[{ key: "count", label: "Count" }]} />
        </ChartCard>
        <ChartCard title="Category distribution" subtitle="Your products by category.">
          <HorizontalRankingChart data={data?.categoryRanking || []} />
        </ChartCard>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Storefront events"
          subtitle="Attributed AnalyticsEvent counts for your vendorId. Not unique visitors."
        >
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg border border-border p-3">
              <p className="m-0 text-xs text-muted">Product views</p>
              <p className="mt-1 text-xl font-semibold">{k?.productViews ?? "—"}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="m-0 text-xs text-muted">Vendor views</p>
              <p className="mt-1 text-xl font-semibold">{k?.vendorViews ?? "—"}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="m-0 text-xs text-muted">Contact events</p>
              <p className="mt-1 text-xl font-semibold">{k?.contactEvents ?? "—"}</p>
            </div>
          </div>
          <div className="gap-banner mt-4">
            Not available yet: unique sessions, invitation “viewed”, CTR, win-rate. See gaps below.
          </div>
        </ChartCard>
        <ChartCard title="Invitation status" subtitle="RFQVendor statuses for your company.">
          <DonutBreakdownChart data={data?.inviteStatus || []} />
        </ChartCard>
      </div>

      <ChartCard title="Recent activity" subtitle="Authorized product and quotation updates only.">
        {(data?.activity || []).length === 0 ? (
          <p className="text-sm text-muted">No recent activity.</p>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Event</th>
                  <th>Detail</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.activity.map((row, i) => (
                  <tr key={`${row.event}-${i}`}>
                    <td>{formatDate(row.date)}</td>
                    <td>{row.event}</td>
                    <td>{row.label}</td>
                    <td>
                      <StatusBadge value={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>

      {(data?.gaps || []).length ? (
        <div className="mt-4 rounded-xl border border-border bg-card p-4 text-xs text-muted">
          <p className="m-0 mb-2 font-semibold text-text">Instrumentation gaps</p>
          <ul className="m-0 space-y-1 ps-4">
            {data.gaps.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </SellerShell>
  );
}
