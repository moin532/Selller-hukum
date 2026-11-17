"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { SellerShell } from "@/components/layout/SellerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatGrid } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChartCard, ChartLoadingSkeleton, ChartErrorState } from "@/components/charts/ChartCard";
import { fetchSellerAnalyticsRollup } from "@/services/analytics-api";
import { fetchMyVendor } from "@/services/company-api";
import { formatDate } from "@/lib/utils";
import { VerificationWaitingCard } from "@/components/ui/VerificationWaitingBanner";
import { useTheme } from "@/components/providers/ThemeProvider";

const LineTrendChart = dynamic(
  () => import("@/components/charts/LineTrendChart").then((m) => m.LineTrendChart),
  { ssr: false, loading: () => <ChartLoadingSkeleton height={200} /> }
);
const DonutBreakdownChart = dynamic(
  () => import("@/components/charts/DonutBreakdownChart").then((m) => m.DonutBreakdownChart),
  { ssr: false, loading: () => <ChartLoadingSkeleton height={200} /> }
);

export default function OverviewPage() {
  const { lang } = useTheme();
  const [data, setData] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchSellerAnalyticsRollup({ range: "30d", granularity: "day", compare: true }),
      fetchMyVendor().catch(() => null),
    ])
      .then(([rollup, v]) => {
        setData(rollup);
        setVendor(v);
      })
      .catch((e) => setError(e.message || "Failed to load overview"))
      .finally(() => setLoading(false));
  }, []);

  const t = data?.kpis;
  const stats = [
    { label: "Products", value: String(t?.totalProducts ?? "—"), hint: "Your catalog" },
    { label: "Published", value: String(t?.published ?? "—"), hint: "Live listings" },
    { label: "Awaiting review", value: String(t?.awaiting ?? "—"), hint: "Submitted" },
    { label: "RFQ invites", value: String(t?.invitations ?? "—"), hint: "Authorized only" },
    { label: "Quotations", value: String(t?.quotations ?? "—"), hint: "Your quotes" },
    { label: "Verification", value: t?.verification || "—", hint: "Company trust" },
  ];

  return (
    <SellerShell title="Overview">
      <PageHeader
        title="Overview"
        subtitle="Live seller snapshot from server-side rollups scoped to your company."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/analytics" className="btn-outline">
              Analytics
            </Link>
            <Link href="/dashboard/products/new" className="btn-primary">
              New product
            </Link>
          </div>
        }
      />
      {error ? <ChartErrorState message={error} /> : null}
      <div className="mb-4">
        <VerificationWaitingCard
          vendor={
            vendor ||
            (data?.vendor
              ? {
                  verificationStatus: data.vendor.verificationStatus,
                  status: data.vendor.status,
                  completenessScore: data.vendor.completenessScore,
                  legalName: { en: data.vendor.name },
                  tradeName: data.vendor.name,
                }
              : null)
          }
          lang={lang}
        />
      </div>
      {loading && !data ? <ChartLoadingSkeleton height={100} /> : <StatGrid items={stats} />}

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <ChartCard title="30-day catalog trend" subtitle="Created vs published (by createdAt).">
          <LineTrendChart
            data={data?.catalogSeries || []}
            series={[
              { key: "created", label: "Created" },
              { key: "published", label: "Published" },
            ]}
            height={200}
          />
        </ChartCard>
        <ChartCard title="Product status" subtitle="Your current moderation mix.">
          <DonutBreakdownChart data={data?.productStatus || []} height={200} />
        </ChartCard>
      </div>

      {!loading && data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="m-0 text-sm font-semibold">Company</h2>
            <p className="mt-2 text-lg font-medium">{data.vendor?.name || "—"}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusBadge value={data.vendor?.verificationStatus} />
              <StatusBadge value={data.vendor?.status} />
            </div>
            <p className="mt-3 text-sm text-muted">
              Completeness: {data.vendor?.completenessScore ?? 0}% ·{" "}
              <Link href="/dashboard/company-profile" className="text-gold">
                Edit profile
              </Link>
            </p>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="m-0 text-sm font-semibold">Storefront events (30d)</h2>
            <p className="mt-3 text-sm text-muted">Product views: {t?.productViews ?? 0}</p>
            <p className="text-sm text-muted">Vendor views: {t?.vendorViews ?? 0}</p>
            <p className="text-sm text-muted">Contact events: {t?.contactEvents ?? 0}</p>
            <Link href="/dashboard/analytics" className="mt-3 inline-block text-sm text-gold">
              Open analytics
            </Link>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 lg:col-span-2">
            <h2 className="m-0 text-sm font-semibold">Recent activity</h2>
            {(data.activity || []).length === 0 ? (
              <EmptyState title="No activity yet" body="Products and quotations will appear here." />
            ) : (
              <div className="data-table-wrap mt-3">
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
                    {data.activity.slice(0, 8).map((row, i) => (
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
          </section>
        </div>
      ) : null}
    </SellerShell>
  );
}
