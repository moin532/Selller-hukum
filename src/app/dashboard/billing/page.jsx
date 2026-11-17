"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SellerShell } from "@/components/layout/SellerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { apiGet } from "@/lib/api-client";
import { fetchMyVendor } from "@/services/company-api";

export default function BillingPage() {
  const [vendor, setVendor] = useState(null);
  const [entitlements, setEntitlements] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    fetchMyVendor()
      .then(setVendor)
      .catch(() => setVendor(null));
    apiGet("/api/monetisation?resource=me")
      .then(({ json }) => {
        if (json.success) setEntitlements(json.data);
      })
      .catch(() => undefined);
    apiGet("/api/monetisation?resource=ledger")
      .then(({ json }) => {
        if (json.success) {
          setPayments(Array.isArray(json.data?.payments) ? json.data.payments : []);
          setInvoices(Array.isArray(json.data?.invoices) ? json.data.invoices : []);
        }
      })
      .catch(() => undefined);
  }, []);

  const plan = entitlements?.planKey || vendor?.subscriptionPlanKey || vendor?.plan || "Free";
  const renewsAt = entitlements?.renewsAt || vendor?.subscription?.renewsAt;
  const amount = vendor?.subscription?.amount ?? entitlements?.plan?.chargeSar;

  return (
    <SellerShell title="Billing">
      <PageHeader
        title="Plan, billing & ZATCA"
        subtitle="Subscription plan, ZATCA-ready invoices, and renewal reminders (7 days before)."
        actions={
          <Link href="/dashboard/pricing" className="btn-primary">
            Change plan
          </Link>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="m-0 text-[10px] uppercase text-muted">Current plan</p>
          <p className="mt-1 mb-0 text-xl font-semibold capitalize">{String(plan)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="m-0 text-[10px] uppercase text-muted">ZATCA</p>
          <p className="mt-1 mb-0 text-sm font-semibold">Simplified invoices issued on upgrade</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="m-0 text-[10px] uppercase text-muted">Next renewal</p>
          <p className="mt-1 mb-0 text-sm font-semibold">
            {renewsAt ? new Date(renewsAt).toLocaleDateString() : "—"}
            {amount != null ? ` · SAR ${amount}` : ""}
          </p>
        </div>
      </div>

      {entitlements?.entitlements ? (
        <div className="mb-6 rounded-xl border border-border bg-card p-4 text-xs text-muted">
          <p className="m-0 mb-2 text-[10px] font-semibold uppercase text-muted">Entitlements</p>
          <p className="m-0">
            Matched leads / mo: {entitlements.entitlements.matchedLeadsPerMonth} · CRM:{" "}
            {entitlements.entitlements.crm} · AI catalogue:{" "}
            {entitlements.entitlements.aiCatalogue ? "yes" : "no"} · Custom domain:{" "}
            {entitlements.entitlements.customDomain ? "yes" : "no"} · Demand radar:{" "}
            {entitlements.entitlements.demandRadar ? "yes" : "no"}
          </p>
        </div>
      ) : null}

      <h2 className="mb-2 text-sm font-semibold">ZATCA invoices</h2>
      <div className="mb-8 overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/20 text-left text-xs uppercase text-muted">
            <tr>
              <th className="p-3">Invoice</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-4 text-muted">
                  No invoices yet — upgrade to Gold or Premium to issue a ZATCA simplified invoice.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv._id} className="border-t border-border">
                  <td className="p-3 font-mono text-xs">{inv.number || inv._id}</td>
                  <td className="p-3">
                    {inv.currency || "SAR"} {inv.amount}
                  </td>
                  <td className="p-3 capitalize">{inv.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mb-2 text-sm font-semibold">Payments</h2>
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/20 text-left text-xs uppercase text-muted">
            <tr>
              <th className="p-3">Ref</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Provider</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-muted">
                  No payments yet.
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p._id} className="border-t border-border">
                  <td className="p-3 font-mono text-xs">{p.providerRef || p._id}</td>
                  <td className="p-3">
                    {p.currency || "SAR"} {p.amount}
                  </td>
                  <td className="p-3">{p.provider}</td>
                  <td className="p-3 capitalize">{p.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </SellerShell>
  );
}
