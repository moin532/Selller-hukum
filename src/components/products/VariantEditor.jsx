"use client";

import { Plus, Trash2 } from "lucide-react";
import { FileUploader } from "@/components/ui/FileUploader";
import { mediaAbsoluteUrl } from "@/services/uploads-api";

const emptyVariant = () => ({
  name: "",
  color: "",
  size: "",
  sku: "",
  price: "",
  stock: "",
  image: "",
});

/** Color / size / SKU variant rows with optional image upload */
export function VariantEditor({ variants = [], onChange, productId = "" }) {
  function update(i, field, val) {
    onChange(variants.map((v, idx) => (idx === i ? { ...v, [field]: val } : v)));
  }

  function add() {
    onChange([...variants, emptyVariant()]);
  }

  function remove(i) {
    onChange(variants.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-4">
      {variants.length === 0 ? (
        <p className="text-sm text-muted">No variants yet. Add color/size rows if this product has options.</p>
      ) : null}
      {variants.map((v, i) => (
        <div key={i} className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="m-0 text-sm font-medium">Variant {i + 1}</p>
            <button type="button" className="btn-icon" aria-label="Remove variant" onClick={() => remove(i)}>
              <Trash2 size={14} />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block text-xs text-muted">
              Color
              <input
                className="input-field mt-1"
                value={v.color || ""}
                onChange={(e) => update(i, "color", e.target.value)}
                placeholder="e.g. Red"
              />
            </label>
            <label className="block text-xs text-muted">
              Size
              <input
                className="input-field mt-1"
                value={v.size || ""}
                onChange={(e) => update(i, "size", e.target.value)}
                placeholder="e.g. XL / 25mm"
              />
            </label>
            <label className="block text-xs text-muted">
              Display name
              <input
                className="input-field mt-1"
                value={v.name || ""}
                onChange={(e) => update(i, "name", e.target.value)}
                placeholder="Auto from color/size if empty"
              />
            </label>
            <label className="block text-xs text-muted">
              Variant SKU
              <input
                className="input-field mt-1"
                value={v.sku || ""}
                onChange={(e) => update(i, "sku", e.target.value)}
              />
            </label>
            <label className="block text-xs text-muted">
              Price
              <input
                type="number"
                className="input-field mt-1"
                value={v.price ?? ""}
                onChange={(e) => update(i, "price", e.target.value)}
              />
            </label>
            <label className="block text-xs text-muted">
              Stock
              <input
                type="number"
                className="input-field mt-1"
                value={v.stock ?? ""}
                onChange={(e) => update(i, "stock", e.target.value)}
              />
            </label>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr]">
            <FileUploader
              kind="product"
              label="Variant image"
              productId={productId}
              previewUrl={v.image ? mediaAbsoluteUrl(v.image) : ""}
              onUploaded={(file) => update(i, "image", file?.url || "")}
            />
            <label className="block text-xs text-muted">
              Image URL
              <input
                className="input-field mt-1"
                value={v.image || ""}
                onChange={(e) => update(i, "image", e.target.value)}
              />
            </label>
          </div>
        </div>
      ))}
      <button type="button" className="btn-outline inline-flex items-center gap-2" onClick={add}>
        <Plus size={14} />
        Add color / size variant
      </button>
    </div>
  );
}
