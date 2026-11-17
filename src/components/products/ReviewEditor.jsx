"use client";

import { Plus, Trash2, Star } from "lucide-react";
import { FileUploader } from "@/components/ui/FileUploader";
import { mediaAbsoluteUrl } from "@/services/uploads-api";

const emptyReview = () => ({
  customerName: "",
  rating: 5,
  comment: "",
  images: [],
});

/** Seller-submitted customer testimonials with optional review images (pending admin approval) */
export function ReviewEditor({ reviews = [], onChange, productId = "" }) {
  function update(i, field, val) {
    onChange(reviews.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));
  }

  function addImage(i, url) {
    if (!url) return;
    const r = reviews[i];
    const images = [...(r.images || []), url];
    update(i, "images", images);
  }

  function removeImage(i, imgIdx) {
    const r = reviews[i];
    update(
      i,
      "images",
      (r.images || []).filter((_, idx) => idx !== imgIdx)
    );
  }

  function add() {
    onChange([...reviews, emptyReview()]);
  }

  function remove(i) {
    onChange(reviews.filter((_, idx) => idx !== i));
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <p className="text-sm text-muted">
        Optional. Attach customer feedback and photos. Reviews stay pending until Super Admin approves the product.
      </p>
      {reviews.length === 0 ? <p className="text-sm text-muted">No reviews added.</p> : null}
      {reviews.map((r, i) => (
        <div key={i} className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="m-0 text-sm font-medium">Review {i + 1}</p>
            <button type="button" className="btn-icon" aria-label="Remove review" onClick={() => remove(i)}>
              <Trash2 size={14} />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-muted">
              Customer name *
              <input
                className="input-field mt-1"
                value={r.customerName || ""}
                onChange={(e) => update(i, "customerName", e.target.value)}
              />
            </label>
            <label className="block text-xs text-muted">
              Rating (1–5)
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={5}
                  className="input-field"
                  value={r.rating ?? 5}
                  onChange={(e) => update(i, "rating", Number(e.target.value) || 5)}
                />
                <Star size={14} className="text-gold" />
              </div>
            </label>
            <label className="block text-xs text-muted sm:col-span-2">
              Comment
              <textarea
                className="input-field mt-1 min-h-20"
                value={r.comment || ""}
                onChange={(e) => update(i, "comment", e.target.value)}
              />
            </label>
          </div>
          <div className="mt-3">
            <FileUploader
              kind="product"
              label="Review image"
              productId={productId}
              onUploaded={(file) => addImage(i, file?.url || "")}
            />
            {(r.images || []).length ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {r.images.map((url, imgIdx) => (
                  <li key={imgIdx} className="relative h-16 w-16 overflow-hidden rounded-lg border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mediaAbsoluteUrl(url)} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      className="absolute end-0 top-0 rounded bg-bg/80 px-1 text-[10px]"
                      onClick={() => removeImage(i, imgIdx)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ))}
      <button type="button" className="btn-outline inline-flex items-center gap-2" onClick={add}>
        <Plus size={14} />
        Add customer review
      </button>
    </div>
  );
}
