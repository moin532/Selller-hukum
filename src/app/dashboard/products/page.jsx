"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LayoutGrid, List } from "lucide-react";
import { SellerShell } from "@/components/layout/SellerShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  ProductCatalogCard,
  productActionFlags,
} from "@/components/products/ProductCatalogCard";
import {
  deleteProduct,
  fetchMyProducts,
  submitProduct,
  unpublishProduct,
} from "@/services/products-api";
import { fetchMyVendor } from "@/services/company-api";
import { localized, formatDate } from "@/lib/utils";
import { productPrimaryImage, productTitle } from "@/lib/product-display";
import { isVendorVerified, vendorLockMessage } from "@/lib/vendor-access";

export default function ProductsPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [vendor, setVendor] = useState(null);
  const [view, setView] = useState("cards");
  const [selected, setSelected] = useState(() => new Set());

  const verified = isVendorVerified(vendor);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [data, v] = await Promise.all([
        fetchMyProducts({ status, limit: 100 }),
        fetchMyVendor().catch(() => null),
      ]);
      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number(data?.total) || 0);
      setVendor(v);
      setSelected(new Set());
    } catch (e) {
      setItems([]);
      setError(e.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = items.filter((p) => {
    if (!q.trim()) return true;
    const hay = `${localized(p.name, "")} ${p.sku || ""} ${p.brand || ""}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });

  function toggleSelect(id, on) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleSelectAll(on) {
    if (!on) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(visible.map((p) => String(p._id))));
  }

  async function onSubmit(id) {
    if (!verified) {
      setError(vendorLockMessage(vendor));
      return;
    }
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      await submitProduct(id);
      setMessage("Product submitted for review. Admin approval required to publish.");
      await load();
    } catch (e) {
      setError(e.message || "Submit failed");
    } finally {
      setBusyId("");
    }
  }

  async function onUnpublish(id) {
    if (
      !window.confirm(
        "Unpublish this product? It will leave the public catalog and return to Draft so you can edit and re-submit."
      )
    ) {
      return;
    }
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      await unpublishProduct(id);
      setMessage("Product unpublished — now Draft. Submit again when ready.");
      await load();
    } catch (e) {
      setError(e.message || "Unpublish failed");
    } finally {
      setBusyId("");
    }
  }

  async function onDelete(id) {
    if (
      !window.confirm(
        "Permanently delete this product? It will be removed completely and cannot be undone."
      )
    ) {
      return;
    }
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      await deleteProduct(id);
      setMessage("Product deleted completely.");
      await load();
    } catch (e) {
      setError(e.message || "Delete failed");
    } finally {
      setBusyId("");
    }
  }

  const selectedProducts = visible.filter((p) => selected.has(String(p._id)));
  const bulkCanSubmit = selectedProducts.some((p) => productActionFlags(p.status).canSubmit);
  const bulkCanUnpublish = selectedProducts.some((p) => productActionFlags(p.status).canUnpublish);

  async function runBulk(action) {
    const ids = [...selected];
    if (!ids.length) return;
    if (
      action === "delete" &&
      !window.confirm(
        `Permanently delete ${ids.length} product(s)? This cannot be undone.`
      )
    ) {
      return;
    }
    if (
      action === "unpublish" &&
      !window.confirm(`Unpublish ${ids.length} product(s) back to Draft?`)
    ) {
      return;
    }
    setError("");
    setMessage("");
    let ok = 0;
    const fails = [];
    for (const id of ids) {
      const row = items.find((p) => String(p._id) === id);
      const flags = productActionFlags(row?.status);
      setBusyId(id);
      try {
        if (action === "submit") {
          if (!flags.canSubmit) continue;
          if (!verified) throw new Error(vendorLockMessage(vendor));
          await submitProduct(id);
        } else if (action === "unpublish") {
          if (!flags.canUnpublish) continue;
          await unpublishProduct(id);
        } else if (action === "delete") {
          await deleteProduct(id);
        }
        ok += 1;
      } catch (e) {
        fails.push(e.message || id);
      }
    }
    setBusyId("");
    setMessage(
      `Bulk ${action}: ${ok} succeeded${fails.length ? `, ${fails.length} failed` : ""}.`
    );
    if (fails.length) setError(fails.slice(0, 3).join(" · "));
    await load();
  }

  return (
    <SellerShell title="Products">
      <div className="mb-8 overflow-hidden rounded-2xl border border-[#17634b]/15 bg-gradient-to-br from-[#0b3d2e] via-[#145c44] to-[#17634b] px-6 py-7 text-white md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="m-0 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[#e8d5a3]">
              Hukum · المنتجات
            </p>
            <h1 className="mt-2 mb-0 font-[family-name:var(--font-head)] text-3xl font-semibold tracking-tight">
              Products
            </h1>
            <p className="mt-2 mb-0 max-w-lg text-sm leading-relaxed text-white/75">
              Create manually, import CSV, or build with AI — one catalogue for your storefront.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/products/import"
              className="rounded-lg border border-white/20 bg-white/5 px-3.5 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
            >
              Bulk CSV import
            </Link>
            <Link
              href="/dashboard/products/ai-catalogue"
              className="rounded-lg border border-white/20 bg-white/5 px-3.5 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
            >
              AI catalogue
            </Link>
            {verified ? (
              <Link href="/dashboard/products/new" className="rounded-lg bg-[#c9a227] px-3.5 py-2 text-sm font-semibold text-[#0b3d2e] transition hover:bg-[#e8d5a3]">
                New product
              </Link>
            ) : (
              <button type="button" className="btn-primary" disabled title={vendorLockMessage(vendor)}>
                New product (locked)
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3 sm:gap-5">
        <Link
          href="/dashboard/products/new"
          className="block rounded-2xl border border-[#17634b]/12 bg-card p-5 transition hover:border-[#c9a227]/40"
        >
          <p className="m-0 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[#8a6a2f]">Manual</p>
          <p className="mt-2 mb-0 text-base font-semibold text-text">Add product</p>
          <p className="mt-2 mb-0 text-sm leading-relaxed text-muted">Fill the form yourself — name, photos, price.</p>
        </Link>
        <Link
          href="/dashboard/products/ai-catalogue"
          className="block rounded-2xl border border-[#17634b]/12 bg-card p-5 transition hover:border-[#c9a227]/40"
        >
          <p className="m-0 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[#8a6a2f]">AI</p>
          <p className="mt-2 mb-0 text-base font-semibold text-text">AI catalogue</p>
          <p className="mt-2 mb-0 text-sm leading-relaxed text-muted">Paste text or a list — AI builds drafts for you.</p>
        </Link>
        <Link
          href="/dashboard/products/import"
          className="block rounded-2xl border border-[#17634b]/12 bg-card p-5 transition hover:border-[#c9a227]/40"
        >
          <p className="m-0 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[#8a6a2f]">Bulk</p>
          <p className="mt-2 mb-0 text-base font-semibold text-text">CSV import</p>
          <p className="mt-2 mb-0 text-sm leading-relaxed text-muted">Upload a spreadsheet of many products at once.</p>
        </Link>
      </div>
      {!verified && vendor ? (
        <p className="mb-5 text-sm text-gold">{vendorLockMessage(vendor)}</p>
      ) : null}
      {error ? <p className="mb-5 text-sm text-danger">{error}</p> : null}
      {message ? <p className="mb-5 text-sm text-gold">{message}</p> : null}

      <div className="mb-7 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <input
          className="input-field max-w-xs"
          placeholder="Search name, SKU, brand…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="input-field max-w-[12rem]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="draft">draft</option>
          <option value="submitted">submitted</option>
          <option value="under_review">under_review</option>
          <option value="published">published</option>
          <option value="rejected">rejected</option>
          <option value="archived">archived</option>
        </select>
        <button type="button" className="btn-outline" onClick={load} disabled={loading}>
          Refresh
        </button>
        <div className="ms-auto flex overflow-hidden rounded-lg border border-border">
          <button
            type="button"
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold ${
              view === "cards" ? "bg-[#17634b]/10 text-[#17634b]" : "bg-card text-muted"
            }`}
            onClick={() => setView("cards")}
          >
            <LayoutGrid size={14} /> Cards
          </button>
          <button
            type="button"
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold ${
              view === "table" ? "bg-[#17634b]/10 text-[#17634b]" : "bg-card text-muted"
            }`}
            onClick={() => setView("table")}
          >
            <List size={14} /> Table
          </button>
        </div>
      </div>

      {selected.size > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-gold/40 bg-gold-muted px-3 py-2.5 text-sm">
          <span className="font-semibold">{selected.size} selected</span>
          {bulkCanSubmit ? (
            <button
              type="button"
              className="btn-primary text-xs"
              disabled={!!busyId || !verified}
              title={!verified ? vendorLockMessage(vendor) : "Submit selected drafts for admin approval"}
              onClick={() => runBulk("submit")}
            >
              Submit for approval
            </button>
          ) : null}
          {bulkCanUnpublish ? (
            <button
              type="button"
              className="btn-outline text-xs"
              disabled={!!busyId}
              onClick={() => runBulk("unpublish")}
            >
              Unpublish
            </button>
          ) : null}
          <button
            type="button"
            className="rounded-lg border border-danger/50 bg-danger/10 px-2.5 py-1.5 text-xs font-semibold text-danger hover:bg-danger/20 disabled:opacity-50"
            disabled={!!busyId}
            onClick={() => runBulk("delete")}
          >
            Delete permanently
          </button>
          <button type="button" className="btn-outline text-xs" onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : visible.length === 0 ? (
        <EmptyState title="No products" body={`Total from API: ${total}. Create a draft to get started.`} />
      ) : view === "cards" ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visible.map((p) => (
            <ProductCatalogCard
              key={String(p._id)}
              product={p}
              busy={busyId === String(p._id)}
              verified={verified}
              lockTitle={vendorLockMessage(vendor)}
              selected={selected.has(String(p._id))}
              onSelect={toggleSelect}
              onSubmit={onSubmit}
              onUnpublish={onUnpublish}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={visible.length > 0 && visible.every((p) => selected.has(String(p._id)))}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                  />
                </th>
                <th>Product</th>
                <th>SKU</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => {
                const id = String(p._id);
                const thumb = productPrimaryImage(p);
                const { canSubmit, canUnpublish } = productActionFlags(p.status);
                const isSelected = selected.has(id);
                return (
                  <tr key={id} className={isSelected ? "bg-gold-muted/40" : undefined}>
                    <td>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => toggleSelect(id, e.target.checked)}
                        aria-label={`Select ${productTitle(p)}`}
                      />
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#f0eeea]">
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={thumb} alt="" className="h-full w-full object-contain" />
                          ) : null}
                        </span>
                        <strong>{productTitle(p)}</strong>
                      </div>
                    </td>
                    <td>{p.sku || "—"}</td>
                    <td>
                      <StatusBadge value={p.status} />
                    </td>
                    <td>{formatDate(p.updatedAt)}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/dashboard/products/${id}`} className="btn-outline">
                          View
                        </Link>
                        <Link href={`/dashboard/products/${id}/edit`} className="btn-outline">
                          Edit
                        </Link>
                        {canSubmit ? (
                          <button
                            type="button"
                            className="btn-primary"
                            disabled={busyId === id || !verified}
                            title={!verified ? vendorLockMessage(vendor) : undefined}
                            onClick={() => onSubmit(id)}
                          >
                            Submit
                          </button>
                        ) : null}
                        {canUnpublish ? (
                          <button
                            type="button"
                            className="btn-outline"
                            disabled={busyId === id}
                            onClick={() => onUnpublish(id)}
                          >
                            Unpublish
                          </button>
                        ) : null}
                        {isSelected || canSubmit || p.status === "submitted" ? (
                          <button
                            type="button"
                            className="rounded-lg border border-danger/50 bg-danger/10 px-2.5 py-1.5 text-xs font-semibold text-danger"
                            disabled={busyId === id}
                            onClick={() => onDelete(id)}
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SellerShell>
  );
}
