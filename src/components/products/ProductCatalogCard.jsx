"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Package } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import {
  formatProductPrice,
  productMediaList,
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

function ProductThumb({ product, title }) {
  const urls = useMemo(
    () => productMediaList(product).map((m) => m.url).filter(Boolean),
    [product]
  );
  const [index, setIndex] = useState(0);
  const src = urls[index] || "";

  if (!src) {
    return (
      <span className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-[#f3f1ec] text-muted">
        <Package size={26} strokeWidth={1.5} />
        <span className="text-[11px] font-medium">No image</span>
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={title || ""}
      className="h-full w-full object-cover"
      loading="lazy"
      onError={() => {
        setIndex((i) => (i + 1 < urls.length ? i + 1 : urls.length));
      }}
    />
  );
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
  const price = formatProductPrice(product);
  const title = productTitle(product);
  const secondary = productTitleSecondary(product);
  const { canSubmit, canUnpublish, canDelete } = productActionFlags(product.status);
  const showDelete = canDelete && (selected || canSubmit || product.status === "submitted");
  const mediaCount = productMediaList(product).length;

  return (
    <article
      className={`relative flex h-full flex-col overflow-hidden rounded-xl border bg-card transition hover:border-gold/45 ${
        selected ? "border-gold ring-1 ring-gold/40" : "border-border"
      }`}
    >
      {onSelect ? (
        <label className="absolute start-2 top-2 z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-border bg-card/95 shadow-sm">
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
        className="relative block aspect-[4/3] shrink-0 overflow-hidden bg-[#ebe8e2]"
      >
        <ProductThumb product={product} title={title} />
        <span className={`absolute top-2 ${onSelect ? "end-2" : "start-2"}`}>
          <StatusBadge value={product.status} />
        </span>
        <span className="absolute bottom-2 end-2 rounded-full bg-[#1a1612]/88 px-2.5 py-1 text-[11px] font-semibold text-white">
          {price.label}
        </span>
        {mediaCount > 1 ? (
          <span className="absolute bottom-2 start-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white">
            {mediaCount} photos
          </span>
        ) : null}
      </Link>

      <div className="flex flex-col gap-2.5 p-3">
        <div className="min-w-0">
          <Link
            href={`/dashboard/products/${id}`}
            className="line-clamp-2 text-[13px] font-semibold leading-snug text-text hover:text-gold"
          >
            {title}
          </Link>
          {secondary ? (
            <p className="m-0 mt-0.5 line-clamp-1 text-[11px] text-muted" dir="rtl">
              {secondary}
            </p>
          ) : null}
          <p className="m-0 mt-1 text-[11px] leading-snug text-muted">
            {[product.brand, product.sku].filter(Boolean).join(" · ") || "No SKU"}
            {" · "}
            {formatDate(product.updatedAt)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1.5 border-t border-border pt-2.5">
          <Link href={`/dashboard/products/${id}`} className="btn-outline justify-center !px-2 !py-1.5 text-center text-xs">
            View
          </Link>
          <Link href={`/dashboard/products/${id}/edit`} className="btn-outline justify-center !px-2 !py-1.5 text-center text-xs">
            Edit
          </Link>
          {canSubmit ? (
            <button
              type="button"
              className="btn-primary col-span-2 justify-center !py-1.5 text-xs"
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
              className="btn-outline col-span-2 justify-center !py-1.5 text-xs"
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
              className="col-span-2 rounded-lg border border-danger/50 bg-danger/10 px-2.5 py-1.5 text-xs font-semibold text-danger hover:bg-danger/20 disabled:opacity-50"
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
