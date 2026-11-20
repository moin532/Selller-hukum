"use client";

import Link from "next/link";
import { Package } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import {
  formatProductPrice,
  productPrimaryImage,
  productTitle,
  productTitleSecondary,
} from "@/lib/product-display";

export function productActionFlags(status) {
  const s = String(status || "").toLowerCase();
  // Never show Submit after the product has already been sent for review.
  const alreadySubmitted = ["submitted", "under_review", "published", "approved"].includes(s);
  return {
    canSubmit: !alreadySubmitted && ["draft", "rejected", "archived", "changes_requested"].includes(s),
    canUnpublish: s === "published",
    canDelete: true,
    alreadySubmitted,
  };
}

export function ProductCatalogCard({
  product,
  busy = false,
  verified = true,
  lockTitle = "",
  selected = false,
  onSelect,
  onSubmit,
  onUnpublish,
  onDelete,
}) {
  const id = String(product._id);
  const image = productPrimaryImage(product);
  const price = formatProductPrice(product);
  const title = productTitle(product);
  const secondary = productTitleSecondary(product);
  const { canSubmit, canUnpublish, canDelete } = productActionFlags(product.status);
  const showDelete = canDelete && (selected || canSubmit || product.status === "submitted");

  return (
    <article
      className={`relative flex flex-col overflow-hidden rounded-xl border bg-card transition hover:border-gold/50 ${
        selected ? "border-gold ring-1 ring-gold/40" : "border-border"
      }`}
    >
      {onSelect ? (
        <label className="absolute start-2 top-2 z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-border bg-card/95">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(id, e.target.checked)}
            aria-label={`Select ${title}`}
          />
        </label>
      ) : null}
      <Link
        href={`/dashboard/products/${id}`}
        className="relative block aspect-[5/4] bg-[#f0eeea]"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-full w-full object-contain p-3" />
        ) : (
          <span className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted">
            <Package size={28} strokeWidth={1.5} />
            <span className="text-xs">No image</span>
          </span>
        )}
        <span className={`absolute top-2 ${onSelect ? "end-2" : "start-2"}`}>
          <StatusBadge value={product.status} />
        </span>
        <span className="absolute bottom-2 end-2 rounded-full bg-[#1a1612]/85 px-2.5 py-1 text-[11px] font-semibold text-white">
          {price.label}
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div className="min-w-0">
          <Link
            href={`/dashboard/products/${id}`}
            className="line-clamp-2 text-sm font-semibold text-text hover:text-gold"
          >
            {title}
          </Link>
          {secondary ? (
            <p className="m-0 mt-0.5 line-clamp-1 text-xs text-muted" dir="rtl">
              {secondary}
            </p>
          ) : null}
          <p className="m-0 mt-1 text-[11px] text-muted">
            {[product.brand, product.sku].filter(Boolean).join(" · ") || "No SKU"}
            {" · "}
            {formatDate(product.updatedAt)}
          </p>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2 border-t border-border pt-3">
          <Link href={`/dashboard/products/${id}`} className="btn-outline justify-center text-center text-xs">
            View
          </Link>
          <Link href={`/dashboard/products/${id}/edit`} className="btn-outline justify-center text-center text-xs">
            Edit
          </Link>
          {canSubmit ? (
            <button
              type="button"
              className="btn-primary col-span-2 justify-center text-xs"
              disabled={busy || !verified}
              title={!verified ? lockTitle : "Submit for Super Admin approval"}
              onClick={() => onSubmit?.(id)}
            >
              {busy ? "…" : "Final submit"}
            </button>
          ) : null}
          {canUnpublish ? (
            <button
              type="button"
              className="btn-outline col-span-2 justify-center text-xs"
              disabled={busy}
              title="Remove from public catalog (back to draft)"
              onClick={() => onUnpublish?.(id)}
            >
              Unpublish
            </button>
          ) : null}
          {showDelete ? (
            <button
              type="button"
              className={`rounded-lg border border-danger/50 bg-danger/10 px-2.5 py-1.5 text-xs font-semibold text-danger hover:bg-danger/20 disabled:opacity-50 ${
                canSubmit || canUnpublish ? "col-span-2" : "col-span-2"
              }`}
              disabled={busy}
              title="Permanently delete this product"
              onClick={() => onDelete?.(id)}
            >
              Delete
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
