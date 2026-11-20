"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ImagePlus, AlertTriangle } from "lucide-react";
import { SellerShell } from "@/components/layout/SellerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { PlanGate } from "@/components/billing/PlanGate";
import { apiPost } from "@/lib/api-client";
import { mediaAbsoluteUrl } from "@/services/uploads-api";

function mediaUrl(path) {
  return mediaAbsoluteUrl(path);
}

function productsFromResult(result) {
  const raw = result?.extraction?.extracted;
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object" && Array.isArray(raw.products)) return raw.products;
  if (raw && typeof raw === "object") return [raw];
  return [];
}

function galleryFor(p) {
  if (Array.isArray(p.media) && p.media.length) {
    return p.media.filter((m) => m && m.url);
  }
  if (p.imageUrl) return [{ url: p.imageUrl, isPrimary: true }];
  return [];
}

/**
 * AI catalogue builder — bilingual drafts + optional AI product photos.
 */
export default function AiCataloguePage() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [msg, setMsg] = useState("");
  const [created, setCreated] = useState([]);
  const [editNotes, setEditNotes] = useState({});
  const [editingIndex, setEditingIndex] = useState(null);
  const [imageBusyIndex, setImageBusyIndex] = useState(null);
  const [generateImages, setGenerateImages] = useState(true);

  const products = useMemo(() => productsFromResult(result), [result]);
  const extractionId = result?.extraction?._id || result?.extraction?.id;

  async function extract(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError("");
    setMsg("");
    setCreated([]);
    setEditNotes({});
    try {
      const { json } = await apiPost("/api/ai", {
        action: "extract_products",
        text: text.trim(),
        generateImages: Boolean(generateImages),
      });
      if (!json.success) throw new Error(json.message || "Extract failed");
      setResult(json.data);
      const rows = productsFromResult(json.data);
      const failed = rows.filter((p) => p?.specs?.imageGenError || (p?.tags || []).includes("image-gen-failed"));
      const withPhoto = rows.filter((p) => galleryFor(p).length > 0).length;
      setMsg(
        generateImages
          ? `Drafts ready · ${withPhoto}/${rows.length} with AI photos${
              failed.length ? ` · ${failed.length} need retry (use Generate AI photo)` : ""
            }. Review then approve.`
          : json.message ||
              "AI drafts ready — review, request changes if needed, then approve to save drafts."
      );
    } catch (err) {
      setError(err.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function applyEdit(index) {
    const changeNote = String(editNotes[index] || "").trim();
    if (!extractionId || !changeNote) return;
    setBusy(true);
    setEditingIndex(index);
    setError("");
    try {
      const { json } = await apiPost("/api/ai", {
        action: "edit_extraction",
        id: extractionId,
        index,
        changeNote,
      });
      if (!json.success) throw new Error(json.message || "Edit failed");
      setResult(json.data);
      setEditNotes((prev) => ({ ...prev, [index]: "" }));
      setMsg(`Updated product #${index + 1} from your change note.`);
    } catch (err) {
      setError(err.message || "Edit failed");
    } finally {
      setBusy(false);
      setEditingIndex(null);
    }
  }

  async function generatePhoto(index) {
    if (!extractionId) return;
    setImageBusyIndex(index);
    setError("");
    try {
      const { json } = await apiPost("/api/ai", {
        action: "generate_product_images",
        id: extractionId,
        index,
        count: 1,
      });
      if (!json.success) throw new Error(json.message || "Image generation failed");
      setResult(json.data);
      setMsg(`AI photo ready for product #${index + 1}.`);
    } catch (err) {
      setError(err.message || "Image generation failed");
    } finally {
      setImageBusyIndex(null);
    }
  }

  async function approve() {
    if (!extractionId) return;
    setBusy(true);
    setError("");
    try {
      const { json } = await apiPost("/api/ai", { action: "approve_extraction", id: extractionId });
      if (!json.success) throw new Error(json.message || "Approve failed");
      setResult(json.data);
      setCreated(Array.isArray(json.data?.products) ? json.data.products : []);
      setMsg(
        json.message ||
          "Draft listings created — not published. Open Products to edit or submit for review."
      );
    } catch (err) {
      setError(err.message || "Approve failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SellerShell title="AI catalogue">
      <PageHeader
        title="AI catalogue builder"
        subtitle="Paste a buyer-style price list → bilingual drafts + taxonomy match. AI photos are placeholders — replace with your real photos before publish."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/products?status=draft" className="btn-outline">
              View drafts
            </Link>
            <Link href="/dashboard/products/import" className="btn-outline">
              Bulk CSV upload
            </Link>
          </div>
        }
      />
      <PlanGate feature="aiCatalogue" minPlan="gold">
        {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
        {msg ? <p className="mb-3 text-sm text-gold">{msg}</p> : null}

        {created.length ? (
          <div className="mb-6 rounded-xl border border-border bg-card p-4">
            <p className="m-0 text-sm font-semibold text-ink">
              {created.length} draft listing{created.length === 1 ? "" : "s"} saved
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {created.map((p) => (
                <li key={p.id}>
                  <Link href={`/dashboard/products/${p.id}`} className="text-ink underline">
                    {p.nameEn}
                  </Link>{" "}
                  <span className="text-muted">
                    · {p.sku} · {p.status}
                  </span>
                </li>
              ))}
            </ul>
            <Link href="/dashboard/products?status=draft" className="btn-primary mt-3 inline-flex">
              Open products
            </Link>
          </div>
        ) : null}

        <form onSubmit={extract} className="mb-6 max-w-2xl space-y-3 rounded-xl border border-border bg-card p-4">
          <label className="block text-sm text-muted">
            Price list / catalogue text (EN or AR) — any new product, even if not in our library
            <textarea
              className="input-field mt-1 min-h-[160px]"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Galvanized cable tray 300 mm — 2.5 mm — HDG — MOQ 50 pcs — 85 SAR
Perforated cable tray 100x50 mm — 1.2 mm — MOQ 100 — 42 SAR
Hot-dip safety barrier with foot board — MOQ 20 — 320 SAR`}
            />
          </label>
          <label className="flex items-start gap-2 text-sm text-muted">
            <input
              type="checkbox"
              className="mt-1"
              checked={generateImages}
              onChange={(e) => setGenerateImages(e.target.checked)}
              disabled={busy}
            />
            <span>
              Generate AI product photos (1 per item, first 4 products). Takes ~20–30s each. You can
              retry any failed photo on the card.
            </span>
          </label>
          <button type="submit" className="btn-primary" disabled={busy || !text.trim()}>
            {busy && editingIndex == null && imageBusyIndex == null
              ? generateImages
                ? "Building drafts + AI photos… (may take a minute)"
                : "Building drafts…"
              : generateImages
                ? "Build with AI photos"
                : "Build drafts (no AI photos)"}
          </button>
          <p className="m-0 text-xs text-muted">
            Categories match the live taxonomy. MOQ from your text is kept. AI photos are placeholders
            only.
          </p>
        </form>

        {result?.extraction ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="m-0 text-[10px] uppercase tracking-wide text-muted">
                Status: {result.extraction.status} · {products.length} product
                {products.length === 1 ? "" : "s"}
                {result.mode ? ` · mode: ${result.mode}` : ""}
              </p>
              {result.extraction.status === "needs_review" ? (
                <button type="button" className="btn-primary" disabled={busy} onClick={approve}>
                  {busy && editingIndex == null ? "Saving drafts…" : "Approve & create drafts"}
                </button>
              ) : null}
            </div>

            {products.length ? (
              <div className="grid gap-5 lg:grid-cols-2">
                {products.map((p, i) => {
                  const name = p.nameEn || p.name || p.title || `Product ${i + 1}`;
                  const gallery = galleryFor(p);
                  const price = p.price != null ? Number(p.price) : null;
                  const retail = p.retailPrice != null ? Number(p.retailPrice) : null;
                  const currency = p.currency || "SAR";
                  const short = p.shortDescription?.en || p.description?.en || "";
                  const seoTitle = p.seo?.title?.en || `${name} | Hukum`;
                  const seoDesc = p.seo?.description?.en || short;
                  const canEdit = result.extraction.status === "needs_review";
                  const createdId = created.find((c) => c.sku === p.sku)?.id;
                  const detailsHref = createdId
                    ? `/dashboard/products/${createdId}`
                    : extractionId
                      ? `/dashboard/products/ai-catalogue/preview?id=${encodeURIComponent(extractionId)}&index=${i}`
                      : null;
                  const imageErr = p.specs?.imageGenError;
                  const needsPhoto = !gallery.length;

                  return (
                    <article
                      key={`${p.sku || name}-${i}`}
                      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                    >
                      <div className="grid grid-cols-3 gap-1 bg-[#f3f5f7] p-1">
                        {gallery.length ? (
                          gallery.slice(0, 3).map((m, mi) => (
                            <div
                              key={`${m.url}-${mi}`}
                              className="aspect-square overflow-hidden rounded-lg bg-white"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={mediaUrl(m.url)}
                                alt={m.alt?.en || name}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.opacity = "0.25";
                                }}
                              />
                            </div>
                          ))
                        ) : (
                          <div className="col-span-3 flex aspect-[3/1] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-white px-4 text-center">
                            <ImagePlus className="text-muted" size={22} aria-hidden />
                            <p className="m-0 text-xs text-muted">No product photo yet</p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2.5 p-4">
                        {imageErr ? (
                          <p className="m-0 flex items-start gap-1.5 rounded-lg bg-[#fef3f0] px-2.5 py-2 text-xs text-danger">
                            <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />
                            <span>{String(imageErr).slice(0, 180)}</span>
                          </p>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[#f3f5f7] px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                            {p.sku || "Draft"}
                          </span>
                          <span className="rounded-full bg-[#f3f5f7] px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                            {p.categoryMatched
                              ? p.categoryHint || "Taxonomy"
                              : p.categoryHint
                                ? `${p.categoryHint} (unmatched)`
                                : "Pick category on edit"}
                          </span>
                          {p.moq != null ? (
                            <span className="rounded-full bg-[#f3f5f7] px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                              MOQ {p.moq}
                            </span>
                          ) : null}
                          <span className="rounded-full bg-[#f3f5f7] px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                            {gallery.length
                              ? `${gallery.length} AI photo${gallery.length === 1 ? "" : "s"}`
                              : "No photo"}
                          </span>
                        </div>
                        <h3 className="m-0 text-base font-semibold text-ink">
                          {detailsHref ? (
                            <Link href={detailsHref} className="hover:underline">
                              {name}
                            </Link>
                          ) : (
                            name
                          )}
                        </h3>
                        {p.nameAr && p.nameAr !== name ? (
                          <p className="m-0 text-sm text-muted" dir="rtl">
                            {p.nameAr}
                          </p>
                        ) : null}
                        {short ? (
                          <p className="m-0 text-sm leading-relaxed text-[#3a4a52] line-clamp-3">{short}</p>
                        ) : null}
                        <div className="flex flex-wrap items-baseline gap-2">
                          {price != null ? (
                            <span className="text-lg font-bold text-ink">
                              {price.toLocaleString()} {currency}
                            </span>
                          ) : (
                            <span className="text-xs text-muted">Price on request</span>
                          )}
                          {retail != null && retail > (price || 0) ? (
                            <span className="text-xs text-muted line-through">
                              {retail.toLocaleString()} {currency}
                            </span>
                          ) : null}
                        </div>
                        <div className="rounded-xl border border-dashed border-border bg-[#fafbfc] p-3">
                          <p className="m-0 text-[10px] uppercase tracking-wide text-muted">SEO preview</p>
                          <p className="mt-1 mb-0 text-sm font-semibold text-[#1a4dad]">{seoTitle}</p>
                          <p className="mt-0.5 mb-0 text-xs leading-snug text-[#3a4a52] line-clamp-2">
                            {seoDesc}
                          </p>
                        </div>

                        {detailsHref ? (
                          <Link href={detailsHref} className="btn-outline inline-flex w-full justify-center">
                            View full details
                          </Link>
                        ) : null}

                        {canEdit ? (
                          <div className="space-y-2 rounded-xl border border-border bg-white p-3">
                            {(needsPhoto || imageErr) && (
                              <button
                                type="button"
                                className="btn-primary inline-flex w-full items-center justify-center gap-2"
                                disabled={busy || imageBusyIndex != null}
                                onClick={() => generatePhoto(i)}
                              >
                                <ImagePlus size={16} aria-hidden />
                                {imageBusyIndex === i
                                  ? "Generating AI photo… (~25s)"
                                  : needsPhoto
                                    ? "Generate AI photo"
                                    : "Retry AI photo"}
                              </button>
                            )}
                            <label className="block text-xs text-muted">
                              Ask for particular changes (this product only)
                              <textarea
                                className="input-field mt-1 min-h-[72px] text-sm"
                                value={editNotes[i] || ""}
                                onChange={(e) =>
                                  setEditNotes((prev) => ({ ...prev, [i]: e.target.value }))
                                }
                                placeholder='e.g. "make the tray blue", "regenerate image", "shorter SEO title", "price 2.50 SAR"'
                                disabled={busy}
                              />
                            </label>
                            <button
                              type="button"
                              className="btn-outline"
                              disabled={busy || !String(editNotes[i] || "").trim()}
                              onClick={() => applyEdit(i)}
                            >
                              {busy && editingIndex === i ? "Applying…" : "Apply changes"}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <pre className="max-h-80 overflow-auto rounded-xl border border-border bg-card p-4 text-xs">
                {JSON.stringify(result.extraction.extracted || result.extraction, null, 2)}
              </pre>
            )}

            <p className="mb-0 text-xs text-muted">
              Guard: approve creates <strong>draft</strong> products only — never published automatically.
            </p>
          </div>
        ) : null}
      </PlanGate>
    </SellerShell>
  );
}
