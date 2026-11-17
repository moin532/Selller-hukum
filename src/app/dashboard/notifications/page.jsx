"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SellerShell } from "@/components/layout/SellerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiGet, apiPatch } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

export default function SellerNotificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const { json } = await apiGet("/api/messages?resource=notifications");
      if (!json.success) throw new Error(json.message || "Failed to load");
      setItems(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setItems([]);
      setError(e.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function markRead(id) {
    try {
      await apiPatch("/api/messages", { action: "mark_notification_read", id });
      await load();
    } catch {
      /* ignore */
    }
  }

  return (
    <SellerShell title="Notifications">
      <PageHeader
        title="Notifications"
        subtitle="Product interest, approvals, and buyer alerts for your store."
        actions={
          <button type="button" className="btn-outline" onClick={load} disabled={loading}>
            Refresh
          </button>
        }
      />

      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <EmptyState
          title="No notifications yet"
          body="When a buyer marks interest on your product (heart + OTP), you’ll see it here with their phone number."
        />
      ) : (
        <ul className="m-0 list-none space-y-2 p-0">
          {items.map((n) => {
            const id = String(n._id);
            const title = n.title?.en || n.type || "Notification";
            const body = n.body?.en || "";
            const phone = n.meta?.phone || "";
            const href =
              n.meta?.href ||
              (String(n.type || "").includes("interest") || n.type === "new_lead"
                ? "/dashboard/inquiries"
                : n.meta?.productId
                  ? "/dashboard/products"
                  : "/dashboard/notifications");
            return (
              <li
                key={id}
                className={`rounded-xl border px-4 py-3 ${
                  n.read ? "border-border bg-card opacity-80" : "border-gold/40 bg-gold-muted"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="m-0 text-sm font-semibold text-text">{title}</p>
                    <p className="mt-1 mb-0 text-sm text-muted">{body}</p>
                    {phone ? (
                      <p className="mt-1 mb-0 text-xs font-medium text-gold">
                        Phone:{" "}
                        <a href={`tel:${phone}`} className="underline">
                          {phone}
                        </a>
                      </p>
                    ) : null}
                    <p className="mt-2 mb-0 text-xs text-muted">
                      {n.type} · {n.channel || "in_app"} · {formatDate(n.createdAt)}
                    </p>
                    <Link href={href} className="mt-2 inline-block text-xs font-medium text-gold underline">
                      Open related page
                    </Link>
                  </div>
                  {!n.read ? (
                    <button type="button" className="btn-outline shrink-0" onClick={() => markRead(id)}>
                      Mark read
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SellerShell>
  );
}
