"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, ExternalLink, Package } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, localized } from "@/lib/utils";
import { mediaAbsoluteUrl } from "@/services/uploads-api";
import {
  formatProductPrice,
  productMediaList,
  productTitle,
  productTitleSecondary,
  publicProductUrl,
} from "@/lib/product-display";

function mapAttrs(attributes) {
  if (!attributes) return [];
  if (attributes instanceof Map) return Array.from(attributes.entries());
  if (typeof attributes === "object") return Object.entries(attributes);
  return [];
}

function Field({ label, children, allowEmpty = false }) {
  if (!allowEmpty && (children == null || children === "")) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-2.5 py-2">
      <p className="m-0 text-[10px] uppercase tracking-wide text-muted">{label}</p>
      <p className="m-0 mt-0.5 whitespace-pre-wrap text-sm font-medium text-text">
        {children == null || children === "" ? "—" : children}
      </p>
    </div>
  );
}

export function ProductDetailView({ product, showPublicLink = true }) {
  const media = useMemo(() => productMediaList(product), [product]);
  const [active, setActive] = useState(0);
  const title = productTitle(product);
  const secondary = productTitleSecondary(product);
  const price = formatProductPrice(product);
  const attrs = mapAttrs(product.attributes);
  const specs = Array.isArray(product.customSpecifications) ? product.customSpecifications : [];
  const certs = Array.isArray(product.certifications) ? product.certifications : [];
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const tags = Array.isArray(product.tags)
    ? product.tags
    : Array.isArray(product.searchTags)
      ? product.searchTags
      : [];
  const seo = product.seo || {};
  const publicUrl = showPublicLink && product.status === "published" ? publicProductUrl(product) : "";
  const current = media[active] || media[0];

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_260px]">
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="relative aspect-[5/4] bg-[#f0eeea]">
            {current?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.url} alt={title} className="h-full w-full object-contain p-4" />
            ) : (
              <span className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted">
                <Package size={36} strokeWidth={1.4} />
                <span className="text-sm">No product images</span>
              </span>
            )}
          </div>
          {media.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto border-t border-border p-2">
              {media.map((m, i) => (
                <button
                  key={`${m.url}-${i}`}
                  type="button"
                  onClick={() => setActive(i)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-[#f0eeea] ${
                    i === active ? "border-gold ring-1 ring-gold" : "border-border"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.url} alt="" className="h-full w-full object-contain p-1" />
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <section className="space-y-3 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge value={product.status} />
            {product.featured ? (
              <span className="inline-flex rounded-full bg-gold/15 px-2.5 py-1 text-[11px] font-semibold text-gold">
                Featured
              </span>
            ) : null}
            {product.vendorId?.verificationStatus === "verified" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                <BadgeCheck size={12} /> Verified seller
              </span>
            ) : null}
          </div>

          <div>
            <h2 className="m-0 text-2xl font-semibold text-text">{title}</h2>
            {secondary ? (
              <p className="m-0 mt-1 text-base text-muted" dir="rtl">
                {secondary}
              </p>
            ) : null}
          </div>

          <div>
            <p className="m-0 text-xl font-bold text-text">{price.label}</p>
            {price.detail ? <p className="m-0 mt-0.5 text-xs text-muted">{price.detail}</p> : null}
          </div>

          <p className="m-0 text-sm leading-relaxed text-muted">
            {localized(product.shortDescription, "") ||
              localized(product.description, "No description yet.")}
          </p>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <Field label="SKU">{product.sku}</Field>
            <Field label="Brand">{product.brand}</Field>
            <Field label="Manufacturer">{product.manufacturer || product.manufacturerName}</Field>
            <Field label="Model">{product.modelNumber || product.model}</Field>
            <Field label="MOQ">{product.moq}</Field>
            <Field label="Max qty">{product.maxOrderQty}</Field>
            <Field label="Unit">{product.unit}</Field>
            <Field label="Lead time">{product.leadTime}</Field>
            <Field label="Availability">{product.availability}</Field>
            <Field label="Condition">{product.condition}</Field>
            <Field label="Origin">{product.countryOfOrigin || product.origin?.countryOfOrigin}</Field>
            <Field label="HS code">{product.hsCode}</Field>
            <Field label="Payment terms">{product.paymentTerms}</Field>
            <Field label="Sample">{product.sampleAvailable ? "Available" : null}</Field>
            <Field label="Price type">{product.priceType}</Field>
            <Field label="Currency">{product.currency}</Field>
          </div>

          {tags.length ? (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-text"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : null}

          {certs.length ? (
            <div className="flex flex-wrap gap-1.5">
              {certs.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-[11px] font-medium text-text"
                >
                  {c}
                </span>
              ))}
            </div>
          ) : null}

          {publicUrl ? (
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-outline inline-flex items-center gap-2 text-sm"
            >
              <ExternalLink size={14} />
              Open live marketplace page
            </a>
          ) : (
            <p className="m-0 text-xs text-muted">
              Live page unlocks after the product is published by Super Admin.
            </p>
          )}
        </section>

        <aside className="space-y-3 rounded-xl border border-border bg-card p-4">
          <p className="m-0 text-xs font-semibold uppercase tracking-wide text-gold">Listing health</p>
          <dl className="m-0 space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Status</dt>
              <dd className="m-0">
                <StatusBadge value={product.status} />
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Completeness</dt>
              <dd className="m-0 font-medium text-text">
                {typeof product.completenessScore === "number" ? `${product.completenessScore}%` : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">SEO score</dt>
              <dd className="m-0 font-medium text-text">
                {typeof product.seoReadinessScore === "number" ? `${product.seoReadinessScore}%` : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Images</dt>
              <dd className="m-0 font-medium text-text">{media.length}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Updated</dt>
              <dd className="m-0 text-end text-text">{formatDate(product.updatedAt)}</dd>
            </div>
          </dl>
          {product.rejectionReason ? (
            <p className="m-0 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
              Rejected: {product.rejectionReason}
            </p>
          ) : null}
        </aside>
      </div>

      {(localized(product.shortDescription, "") || localized(product.description, "") || localized(product.applications, "")) && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="m-0 text-sm font-semibold uppercase tracking-wide text-gold">Descriptions</h3>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <Field label="Short description">{localized(product.shortDescription, "")}</Field>
            <Field label="Applications">{localized(product.applications, "")}</Field>
            <div className="md:col-span-2">
              <Field label="Full description">{localized(product.description, "")}</Field>
            </div>
            {product.description?.ar ? (
              <div className="md:col-span-2" dir="rtl">
                <Field label="Description (AR)">{product.description.ar}</Field>
              </div>
            ) : null}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="m-0 text-sm font-semibold uppercase tracking-wide text-gold">SEO / Meta</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Field label="Meta title" allowEmpty>
            {localized(seo.title, "")}
          </Field>
          <Field label="Meta keywords" allowEmpty>
            {localized(seo.keywords, "")}
          </Field>
          <div className="md:col-span-2">
            <Field label="Meta description" allowEmpty>
              {localized(seo.description, "")}
            </Field>
          </div>
          <Field label="H1" allowEmpty>
            {localized(seo.h1, "")}
          </Field>
          <Field label="Indexable" allowEmpty>
            {seo.indexable === false ? "No" : "Yes"}
          </Field>
          <Field label="Slug (EN)" allowEmpty>
            {product.slug?.en || ""}
          </Field>
          <Field label="Slug (AR)" allowEmpty>
            {product.slug?.ar || ""}
          </Field>
        </div>
      </section>

      {(attrs.length > 0 || specs.length > 0) && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="m-0 text-sm font-semibold uppercase tracking-wide text-gold">Specifications</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Attribute</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {specs.map((row, i) => (
                  <tr key={`spec-${i}`}>
                    <td>{row.key}</td>
                    <td>{row.value}</td>
                  </tr>
                ))}
                {attrs.map(([k, v]) => (
                  <tr key={k}>
                    <td className="capitalize">{String(k).replace(/_/g, " ")}</td>
                    <td>{Array.isArray(v) ? v.join(", ") : String(v ?? "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {variants.length ? (
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="m-0 text-sm font-semibold uppercase tracking-wide text-gold">Variants</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {variants.map((v, i) => (
              <div key={i} className="flex gap-3 rounded-lg border border-border bg-surface p-3">
                <span className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-[#f0eeea]">
                  {v.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaAbsoluteUrl(v.image)} alt="" className="h-full w-full object-contain" />
                  ) : null}
                </span>
                <div className="min-w-0 text-sm">
                  <p className="m-0 font-medium text-text">{v.name || v.sku || `Variant ${i + 1}`}</p>
                  <p className="m-0 text-xs text-muted">
                    {[v.color, v.size, v.sku].filter(Boolean).join(" · ") || "—"}
                  </p>
                  {v.price != null ? <p className="m-0 mt-1 text-xs font-semibold">{v.price} SAR</p> : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
