"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SellerShell } from "@/components/layout/SellerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FileUploader } from "@/components/ui/FileUploader";
import { fetchMyVendor, submitStorefrontDesign } from "@/services/company-api";
import { mediaAbsoluteUrl } from "@/services/uploads-api";
import { localized } from "@/lib/utils";
import { ShareKit } from "@/components/storefront/ShareKit";

const LAYOUTS = [
  { id: "classic", label: "Classic", hint: "Clean hero + product grid" },
  { id: "modern", label: "Modern", hint: "Large cover, bold type" },
  { id: "bold", label: "Bold", hint: "High-contrast brand look" },
];

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000").replace(/\/$/, "");
const MAX_BANNERS = 2;

function normalizeBanners(design, vendor) {
  const fromDesign = Array.isArray(design?.bannerImages)
    ? design.bannerImages.map((u) => String(u || "").trim()).filter(Boolean)
    : [];
  if (fromDesign.length) return fromDesign.slice(0, MAX_BANNERS);
  const cover = design?.coverImage || vendor?.coverImage || "";
  return cover ? [cover] : [];
}

function emptyDesign(vendor) {
  return {
    headline: { en: localized(vendor?.legalName, vendor?.tradeName || "") || "", ar: vendor?.legalName?.ar || "" },
    tagline: { en: "", ar: "" },
    about: { en: vendor?.description?.en || "", ar: vendor?.description?.ar || "" },
    bannerText: { en: "", ar: "" },
    ctaLabel: { en: "Request quotation", ar: "اطلب عرض سعر" },
    primaryColor: "#0F766E",
    accentColor: "#C4A35A",
    layout: "classic",
    coverImage: vendor?.coverImage || "",
    bannerImages: vendor?.coverImage ? [vendor.coverImage] : [],
    logo: vendor?.logo || "",
    showProducts: true,
    showCertifications: true,
    showContactCta: true,
  };
}

export default function StorefrontPage() {
  const [vendor, setVendor] = useState(null);
  const [design, setDesign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [previewBanner, setPreviewBanner] = useState(0);

  useEffect(() => {
    fetchMyVendor()
      .then((v) => {
        setVendor(v);
        const base = emptyDesign(v);
        const pending = v.storefront?.pending;
        const published = v.storefront?.published;
        const chosen = pending || published || base;
        setDesign({
          ...base,
          ...chosen,
          bannerImages: normalizeBanners(chosen, v),
        });
      })
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const slug = vendor?.slug?.en || vendor?.slug || "";
  const publicPath = slug ? `/en/vendors/${slug}` : "";
  const sfStatus = vendor?.storefront?.status || "none";
  const banners = design?.bannerImages || [];

  const previewStyle = useMemo(() => {
    if (!design) return {};
    return {
      "--sf-primary": design.primaryColor || "#0F766E",
      "--sf-accent": design.accentColor || "#C4A35A",
    };
  }, [design]);

  function setField(path, value) {
    setDesign((prev) => {
      if (!prev) return prev;
      if (path.includes(".")) {
        const [a, b] = path.split(".");
        return { ...prev, [a]: { ...(prev[a] || {}), [b]: value } };
      }
      return { ...prev, [path]: value };
    });
  }

  function setBannerAt(index, url) {
    setDesign((prev) => {
      if (!prev) return prev;
      const next = [...(prev.bannerImages || [])];
      if (url) {
        next[index] = url;
      } else {
        next.splice(index, 1);
      }
      const cleaned = next.map((u) => String(u || "").trim()).filter(Boolean).slice(0, MAX_BANNERS);
      return {
        ...prev,
        bannerImages: cleaned,
        coverImage: cleaned[0] || "",
      };
    });
    setPreviewBanner(0);
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!design?.headline?.en?.trim()) {
      setError("Headline (EN) is required");
      return;
    }
    if (!(design.bannerImages || []).length) {
      setError("Upload at least 1 banner image (maximum 2)");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        ...design,
        bannerImages: (design.bannerImages || []).slice(0, MAX_BANNERS),
        coverImage: design.bannerImages?.[0] || design.coverImage || "",
      };
      const data = await submitStorefrontDesign(payload);
      const v = data?.vendor || (await fetchMyVendor());
      setVendor(v);
      const pending = v.storefront?.pending || payload;
      setDesign({
        ...pending,
        bannerImages: normalizeBanners(pending, v),
      });
      setMessage("Submitted to Super Admin. Your live storefront stays on the last approved design until they approve.");
    } catch (err) {
      setError(err.message || "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  const activeBanner = banners[previewBanner % Math.max(banners.length, 1)] || "";

  return (
    <SellerShell title="Storefront">
      <PageHeader
        title="Storefront design"
        subtitle="Customize your public company page. Every change is reviewed by Super Admin before it goes live."
      />

      <div className="mb-4 rounded-xl border border-gold/30 bg-gold-muted/40 px-4 py-3 text-sm text-muted">
        Live public page always shows the <strong className="text-text">last approved</strong> design. Saving here only
        queues a pending draft for approval.
      </div>

      {publicPath ? (
        <div className="mb-5">
          <ShareKit
            publicUrl={`${API_BASE}${publicPath}`}
            companyName={localized(vendor?.legalName, vendor?.tradeName)}
          />
        </div>
      ) : null}

      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
      {message ? <p className="mb-3 text-sm text-gold">{message}</p> : null}

      {loading || !design ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <form onSubmit={onSubmit} className="space-y-5 rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge value={vendor?.verificationStatus} />
              <StatusBadge value={sfStatus === "none" ? "draft" : sfStatus} />
              <span className="text-sm text-muted">{localized(vendor?.legalName, vendor?.tradeName)}</span>
            </div>

            {sfStatus === "rejected" && vendor?.storefront?.rejectionReason ? (
              <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                Rejected: {vendor.storefront.rejectionReason}
              </p>
            ) : null}
            {sfStatus === "pending" ? (
              <p className="rounded-lg border border-gold/40 bg-gold-muted px-3 py-2 text-sm text-gold">
                Waiting for Super Admin approval.
              </p>
            ) : null}

            <section className="space-y-3">
              <h2 className="m-0 text-xs font-semibold uppercase tracking-wide text-gold">Banner images</h2>
              <p className="m-0 text-sm text-muted">
                Upload hero banners for your public page. Maximum {MAX_BANNERS} images.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {[0, 1].map((slot) => {
                  const url = banners[slot] || "";
                  if (slot === 1 && !banners[0] && !url) {
                    return (
                      <div
                        key={slot}
                        className="rounded-xl border border-dashed border-border bg-surface px-3 py-6 text-center text-sm text-muted"
                      >
                        Add banner 1 first
                      </div>
                    );
                  }
                  return (
                    <div key={slot} className="rounded-xl border border-border bg-surface p-3">
                      <FileUploader
                        key={`${slot}-${url || "empty"}`}
                        kind="company_cover"
                        label={`Banner ${slot + 1}${slot === 0 ? " (required)" : " (optional)"}`}
                        previewUrl={url ? mediaAbsoluteUrl(url) : ""}
                        onUploaded={(file) => {
                          const nextUrl = file?.url || "";
                          if (!nextUrl) return;
                          setBannerAt(slot, nextUrl);
                        }}
                      />
                      {url ? (
                        <button
                          type="button"
                          className="btn-outline mt-2 text-xs"
                          onClick={() => setBannerAt(slot, "")}
                        >
                          Remove banner {slot + 1}
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="m-0 text-xs font-semibold uppercase tracking-wide text-gold">Layout</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {LAYOUTS.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setField("layout", l.id)}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      design.layout === l.id
                        ? "border-gold bg-gold-muted ring-1 ring-gold"
                        : "border-border bg-surface hover:border-gold/40"
                    }`}
                  >
                    <p className="m-0 text-sm font-semibold text-text">{l.label}</p>
                    <p className="m-0 mt-1 text-xs text-muted">{l.hint}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="m-0 text-xs font-semibold uppercase tracking-wide text-gold">Copy</h2>
              <label className="block text-sm text-muted">
                Headline (EN) *
                <input
                  className="input-field mt-1"
                  value={design.headline?.en || ""}
                  onChange={(e) => setField("headline.en", e.target.value)}
                  required
                />
              </label>
              <label className="block text-sm text-muted">
                Headline (AR)
                <input
                  className="input-field mt-1"
                  dir="rtl"
                  value={design.headline?.ar || ""}
                  onChange={(e) => setField("headline.ar", e.target.value)}
                />
              </label>
              <label className="block text-sm text-muted">
                Tagline (EN)
                <input
                  className="input-field mt-1"
                  value={design.tagline?.en || ""}
                  onChange={(e) => setField("tagline.en", e.target.value)}
                />
              </label>
              <label className="block text-sm text-muted">
                About / intro (EN)
                <textarea
                  className="input-field mt-1 min-h-24"
                  value={design.about?.en || ""}
                  onChange={(e) => setField("about.en", e.target.value)}
                />
              </label>
              <label className="block text-sm text-muted">
                Banner text (EN)
                <input
                  className="input-field mt-1"
                  value={design.bannerText?.en || ""}
                  onChange={(e) => setField("bannerText.en", e.target.value)}
                  placeholder="Optional promo strip above the hero"
                />
              </label>
              <label className="block text-sm text-muted">
                CTA button label (EN)
                <input
                  className="input-field mt-1"
                  value={design.ctaLabel?.en || ""}
                  onChange={(e) => setField("ctaLabel.en", e.target.value)}
                />
              </label>
            </section>

            <section className="space-y-3">
              <h2 className="m-0 text-xs font-semibold uppercase tracking-wide text-gold">Logo</h2>
              <FileUploader
                kind="company_logo"
                label="Logo (optional override)"
                previewUrl={design.logo ? mediaAbsoluteUrl(design.logo) : ""}
                onUploaded={(file) => setField("logo", file?.url || "")}
              />
            </section>

            <section className="space-y-2">
              <h2 className="m-0 text-xs font-semibold uppercase tracking-wide text-gold">Sections</h2>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={design.showProducts !== false}
                  onChange={(e) => setField("showProducts", e.target.checked)}
                />
                Show products grid
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={design.showCertifications !== false}
                  onChange={(e) => setField("showCertifications", e.target.checked)}
                />
                Show certifications
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={design.showContactCta !== false}
                  onChange={(e) => setField("showContactCta", e.target.checked)}
                />
                Show contact / RFQ CTA
              </label>
            </section>

            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? "Submitting…" : "Submit for Super Admin approval"}
              </button>
              <Link href="/dashboard/products" className="btn-outline">
                Manage products
              </Link>
              {publicPath ? (
                <a
                  className="btn-outline"
                  href={`${API_BASE}${publicPath}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open live page
                </a>
              ) : null}
            </div>
          </form>

          <aside className="space-y-4">
            <section
              className="overflow-hidden rounded-xl border border-border bg-card"
              style={previewStyle}
            >
              <p className="m-0 border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Preview (pending draft)
              </p>
              <div
                className="relative h-36 bg-surface"
                style={{
                  background: activeBanner
                    ? `center/cover url(${mediaAbsoluteUrl(activeBanner)})`
                    : "linear-gradient(135deg, #0F766E, #C4A35A)",
                }}
              >
                {!activeBanner ? (
                  <p className="absolute inset-0 m-0 flex items-center justify-center px-3 text-center text-xs text-white/90">
                    Upload banner images to preview
                  </p>
                ) : null}
                {banners.length > 1 ? (
                  <div className="absolute bottom-2 start-1/2 flex -translate-x-1/2 gap-1.5">
                    {banners.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        aria-label={`Preview banner ${i + 1}`}
                        onClick={() => setPreviewBanner(i)}
                        className={`h-2 w-2 rounded-full ${
                          i === previewBanner % banners.length ? "bg-white" : "bg-white/40"
                        }`}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="space-y-2 p-4">
                <p className="m-0 text-lg font-bold text-text">{design.headline?.en || "Headline"}</p>
                {design.tagline?.en ? <p className="m-0 text-sm text-muted">{design.tagline.en}</p> : null}
                {design.bannerText?.en ? (
                  <p className="m-0 rounded-lg bg-gold/20 px-2 py-1.5 text-xs font-medium text-text">
                    {design.bannerText.en}
                  </p>
                ) : null}
                <p className="m-0 line-clamp-4 text-sm text-muted">{design.about?.en || "About text…"}</p>
                <span className="inline-flex rounded-lg bg-gold px-3 py-1.5 text-xs font-semibold text-white">
                  {design.ctaLabel?.en || "CTA"}
                </span>
                <p className="m-0 text-[11px] uppercase tracking-wide text-muted">
                  Layout · {design.layout} · {banners.length}/{MAX_BANNERS} banners
                </p>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-4 text-sm text-muted">
              <p className="m-0 font-medium text-text">Approval flow</p>
              <ol className="mt-2 list-decimal space-y-1 ps-4">
                <li>Upload up to 2 banner images</li>
                <li>Submit for Super Admin</li>
                <li>Admin approves → goes live on marketplace</li>
                <li>If rejected, fix and resubmit</li>
              </ol>
            </section>
          </aside>
        </div>
      )}
    </SellerShell>
  );
}
