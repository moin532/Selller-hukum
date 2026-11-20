"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Globe, MapPin, Phone, Save, ShieldCheck } from "lucide-react";
import { SellerShell } from "@/components/layout/SellerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fetchMyVendor, submitForVerification, updateMyVendor } from "@/services/company-api";
import { FileUploader } from "@/components/ui/FileUploader";
import { mediaAbsoluteUrl } from "@/services/uploads-api";

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-muted">{hint}</span> : null}
    </label>
  );
}

function Section({ title, icon: Icon, description, children, action }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-surface/60 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-muted text-gold">
            {Icon ? <Icon size={16} /> : null}
          </div>
          <div>
            <h2 className="m-0 text-sm font-semibold text-text">{title}</h2>
            {description ? <p className="mt-0.5 mb-0 text-xs text-muted">{description}</p> : null}
          </div>
        </div>
        {action || null}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default function CompanyProfilePage() {
  const [vendor, setVendor] = useState(null);
  const [form, setForm] = useState({
    tradeName: "",
    email: "",
    phone: "",
    whatsapp: "",
    website: "",
    city: "",
    country: "SA",
    address: "",
    descriptionEn: "",
    descriptionAr: "",
    legalNameEn: "",
    legalNameAr: "",
    crNumber: "",
    vatNumber: "",
    yearEstablished: "",
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const v = await fetchMyVendor();
      if (!v) {
        setVendor(null);
        setError("Vendor profile not found. Complete company registration first.");
        return;
      }
      setVendor(v);
      setForm({
        tradeName: v.tradeName || "",
        email: v.email || "",
        phone: v.phone || "",
        whatsapp: v.whatsapp || v.phone || "",
        website: v.website || "",
        city: v.location?.city || "",
        country: v.location?.country || "SA",
        address: v.location?.address || "",
        descriptionEn: v.description?.en || "",
        descriptionAr: v.description?.ar || "",
        legalNameEn: v.legalName?.en || "",
        legalNameAr: v.legalName?.ar || "",
        crNumber: v.crNumber || "",
        vatNumber: v.vatNumber || "",
        yearEstablished: v.yearEstablished != null ? String(v.yearEstablished) : "",
      });
    } catch (e) {
      setVendor(null);
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const completeness = useMemo(() => Number(vendor?.completenessScore || 0), [vendor]);

  async function onSave(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const data = await updateMyVendor({
        tradeName: form.tradeName,
        email: form.email,
        phone: form.phone,
        whatsapp: form.whatsapp,
        website: form.website,
        legalName: { en: form.legalNameEn, ar: form.legalNameAr },
        description: { en: form.descriptionEn, ar: form.descriptionAr },
        location: { city: form.city, country: form.country, address: form.address },
        crNumber: form.crNumber.trim(),
        vatNumber: form.vatNumber.trim(),
        yearEstablished: form.yearEstablished === "" ? undefined : Number(form.yearEstablished),
      });
      setVendor(data.vendor || data);
      if (data.verificationReset) {
        setMessage(
          "Saved. Legal name / CR / VAT changed — verification was reset to pending for admin re-approval."
        );
      } else {
        setMessage("Profile saved.");
      }
      await load();
    } catch (err) {
      setError(err.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitVerify() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await submitForVerification();
      setMessage("Submitted for verification. Admin will review your documents.");
      await load();
    } catch (err) {
      setError(err.message || "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SellerShell title="Company Profile">
      <PageHeader
        title="Company profile"
        subtitle="Brand, contact, and location shown on your public storefront and product pages."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/storefront" className="btn-outline">
              Storefront
            </Link>
            <Link href="/dashboard/verification" className="btn-outline">
              Documents
            </Link>
            <button
              type="button"
              className="btn-primary"
              onClick={onSubmitVerify}
              disabled={busy || loading || !vendor}
            >
              <ShieldCheck size={14} />
              Submit for verification
            </button>
          </div>
        }
      />

      {error ? (
        <p className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mb-4 rounded-xl border border-gold/30 bg-gold-muted px-4 py-3 text-sm text-gold">
          {message}
        </p>
      ) : null}

      {loading ? (
        <p className="text-muted">Loading company profile…</p>
      ) : !vendor ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <Building2 className="mx-auto text-gold" size={28} />
          <p className="mt-3 mb-1 text-base font-semibold text-text">No company linked</p>
          <p className="m-0 text-sm text-muted">Finish registration to edit your public seller profile.</p>
          <a href="/register/company" className="btn-primary mt-5 inline-flex">
            Complete company registration
          </a>
        </div>
      ) : (
        <form onSubmit={onSave} className="space-y-5">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4">
            <StatusBadge value={vendor.verificationStatus} />
            <StatusBadge value={vendor.status} />
            <div className="ms-auto flex min-w-[160px] flex-1 flex-col gap-1 sm:max-w-xs">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Profile completeness</span>
                <span className="font-semibold text-text">{completeness}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-gold transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, completeness))}%` }}
                />
              </div>
            </div>
          </div>

          <Section
            title="Brand media"
            icon={Building2}
            description="Logo and cover used on your storefront and marketplace cards."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-xl border border-dashed border-border bg-surface/40 p-4">
                <FileUploader
                  kind="company_logo"
                  label="Company logo"
                  previewUrl={vendor?.logo ? mediaAbsoluteUrl(vendor.logo) : ""}
                  onUploaded={(file) => {
                    if (file?.url) {
                      setVendor((v) => (v ? { ...v, logo: file.url } : v));
                    }
                    load();
                  }}
                />
              </div>
              <div className="rounded-xl border border-dashed border-border bg-surface/40 p-4">
                <FileUploader
                  kind="company_cover"
                  label="Cover image"
                  previewUrl={vendor?.coverImage ? mediaAbsoluteUrl(vendor.coverImage) : ""}
                  onUploaded={(file) => {
                    if (file?.url) {
                      setVendor((v) => (v ? { ...v, coverImage: file.url } : v));
                    }
                    load();
                  }}
                />
              </div>
            </div>
          </Section>

          <Section
            title="Identity"
            icon={ShieldCheck}
            description="Legal and trade names shown to buyers and admins."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Legal name (EN)">
                <input
                  className="input-field"
                  value={form.legalNameEn}
                  onChange={(e) => set("legalNameEn", e.target.value)}
                  placeholder="Company LLC"
                />
              </Field>
              <Field label="Legal name (AR)">
                <input
                  className="input-field"
                  dir="rtl"
                  value={form.legalNameAr}
                  onChange={(e) => set("legalNameAr", e.target.value)}
                  placeholder="الاسم القانوني"
                />
              </Field>
              <Field label="Trade name" hint="Public display name on marketplace">
                <input
                  className="input-field"
                  value={form.tradeName}
                  onChange={(e) => set("tradeName", e.target.value)}
                />
              </Field>
              <Field label="Commercial Registration (CR)" hint="Required before admin can approve">
                <input
                  className="input-field"
                  value={form.crNumber}
                  onChange={(e) => set("crNumber", e.target.value)}
                  placeholder="CR number"
                />
              </Field>
              <Field label="VAT number" hint="Required before admin can approve">
                <input
                  className="input-field"
                  value={form.vatNumber}
                  onChange={(e) => set("vatNumber", e.target.value)}
                  placeholder="3XXXXXXXXX00003"
                />
              </Field>
              <Field label="Year established">
                <input
                  className="input-field"
                  type="number"
                  min="1900"
                  max="2100"
                  value={form.yearEstablished}
                  onChange={(e) => set("yearEstablished", e.target.value)}
                />
              </Field>
              <Field label="Street address">
                <input
                  className="input-field"
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                />
              </Field>
            </div>
            <p className="m-0 mt-3 text-xs text-muted">
              Changing legal name, CR, or VAT on a verified account resets the Verified badge until Super Admin
              re-approves.
            </p>
          </Section>

          <Section title="About" icon={Globe} description="Short company story for the storefront.">
            <div className="grid gap-4 lg:grid-cols-2">
              <Field label="Description (EN)">
                <textarea
                  className="input-field min-h-28"
                  value={form.descriptionEn}
                  onChange={(e) => set("descriptionEn", e.target.value)}
                  placeholder="What you supply, regions you cover, strengths…"
                />
              </Field>
              <Field label="Description (AR)">
                <textarea
                  className="input-field min-h-28"
                  dir="rtl"
                  value={form.descriptionAr}
                  onChange={(e) => set("descriptionAr", e.target.value)}
                />
              </Field>
            </div>
          </Section>

          <Section title="Contact" icon={Phone} description="How buyers reach you after contact unlock.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email">
                <input
                  className="input-field"
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </Field>
              <Field label="Phone">
                <input
                  className="input-field"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+9665…"
                />
              </Field>
              <Field label="WhatsApp">
                <input
                  className="input-field"
                  value={form.whatsapp}
                  onChange={(e) => set("whatsapp", e.target.value)}
                  placeholder="+9665…"
                />
              </Field>
              <Field label="Website">
                <input
                  className="input-field"
                  value={form.website}
                  onChange={(e) => set("website", e.target.value)}
                  placeholder="https://"
                />
              </Field>
            </div>
          </Section>

          <Section title="Location" icon={MapPin} description="City and country for matching and search.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="City">
                <input
                  className="input-field"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  placeholder="Riyadh"
                />
              </Field>
              <Field label="Country">
                <input
                  className="input-field"
                  value={form.country}
                  onChange={(e) => set("country", e.target.value)}
                  placeholder="SA"
                />
              </Field>
            </div>
          </Section>

          <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 px-5 py-3 shadow-lg backdrop-blur">
            <p className="m-0 text-xs text-muted">Changes apply to your public profile after save.</p>
            <button type="submit" className="btn-primary" disabled={busy}>
              <Save size={14} />
              {busy ? "Saving…" : "Save profile"}
            </button>
          </div>
        </form>
      )}
    </SellerShell>
  );
}
