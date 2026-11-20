"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { OnboardingShell } from "@/components/marketing/OnboardingShell";
import { FileUploader } from "@/components/ui/FileUploader";
import { loadExtractedFields } from "@/lib/onboarding-from-docs";
import { fetchMyVendor, updateMyVendor } from "@/services/company-api";
import { extractFromFile, extractFromWebsite } from "@/services/onboarding-ai-api";
import { mediaAbsoluteUrl } from "@/services/uploads-api";

const COMPANY_TYPES = [
  { id: "manufacturer", label: "Manufacturer" },
  { id: "distributor", label: "Distributor" },
  { id: "wholesaler", label: "Wholesaler" },
  { id: "trading_company", label: "Trading company" },
  { id: "service_provider", label: "Service provider" },
  { id: "importer", label: "Importer" },
  { id: "exporter", label: "Exporter" },
  { id: "oem", label: "OEM" },
  { id: "other", label: "Other" },
];

const REGIONS = ["Riyadh", "Makkah", "Eastern", "Madinah", "Asir", "Tabuk", "Qassim", "Hail", "Other"];

const EMPTY_FORM = {
  legalNameEn: "",
  legalNameAr: "",
  tradeName: "",
  companyType: "trading_company",
  crNumber: "",
  vatNumber: "",
  yearEstablished: "",
  website: "",
  email: "",
  phone: "",
  whatsapp: "",
  country: "SA",
  region: "Riyadh",
  city: "Riyadh",
  address: "",
  postalCode: "",
  descriptionEn: "",
  descriptionAr: "",
  marketsServed: "",
  paymentTerms: "",
  leadTime: "",
  moq: "",
  authorizedRep: "",
};

export default function RegisterCompanyPage() {
  const router = useRouter();
  const fileRef = useRef(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [logo, setLogo] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [error, setError] = useState("");
  const [aiMessage, setAiMessage] = useState("");
  const [aiUrl, setAiUrl] = useState("");

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function applyExtractedFields(fields, { overwriteFilled = false } = {}) {
    if (!fields || typeof fields !== "object") return 0;
    const entries = Object.entries(fields).filter(
      ([key, value]) => key in EMPTY_FORM && value != null && String(value).trim() !== ""
    );
    setForm((prev) => {
      const next = { ...prev };
      for (const [key, value] of entries) {
        const v = String(value).trim();
        const existing = String(next[key] || "").trim();
        // Re-read must never wipe a filled business name / email with a worse blank path
        if (!overwriteFilled && existing) {
          if (key === "crNumber" && /^\d{10}$/.test(v)) next[key] = v;
          else if (key === "vatNumber" && /^3\d{13}3$/.test(v)) next[key] = v;
          else if (key === "email" && /@/.test(v) && !/@/.test(existing)) next[key] = v;
          else if (
            (key === "legalNameEn" || key === "legalNameAr" || key === "tradeName") &&
            v.length > existing.length + 3
          ) {
            next[key] = v;
          }
          // else keep existing
        } else {
          next[key] = v;
        }
      }
      if (fields.companyType && COMPANY_TYPES.some((t) => t.id === fields.companyType)) {
        if (overwriteFilled || !next.companyType) next.companyType = fields.companyType;
      }
      if (fields.region && REGIONS.includes(fields.region)) {
        if (overwriteFilled || !next.region) next.region = fields.region;
      }
      return next;
    });
    return entries.length;
  }

  useEffect(() => {
    let storedType = "";
    let storedCity = "";
    let fromDocs = null;
    try {
      storedType = sessionStorage.getItem("kt_onboarding_businessType") || "";
      storedCity = sessionStorage.getItem("kt_onboarding_city") || "";
      fromDocs = loadExtractedFields();
    } catch {
      /* ignore */
    }
    const docFields = fromDocs?.fields || {};
    const docCount = Object.keys(docFields).length;

    fetchMyVendor()
      .then((v) => {
        if (!v) return;
        // Prefer document extract for identity fields (AI read); otherwise keep vendor / fallback.
        const DOC_FIRST = new Set([
          "legalNameEn",
          "legalNameAr",
          "tradeName",
          "crNumber",
          "vatNumber",
          "address",
          "email",
          "phone",
          "website",
        ]);
        const pick = (vendorVal, docKey, fallback = "") => {
          const a = vendorVal != null && String(vendorVal).trim() !== "" ? String(vendorVal).trim() : "";
          const b = docFields[docKey] != null && String(docFields[docKey]).trim() !== "" ? String(docFields[docKey]).trim() : "";
          if (DOC_FIRST.has(docKey)) return b || a || fallback;
          return a || b || fallback;
        };
        setForm({
          legalNameEn: pick(v.legalName?.en, "legalNameEn"),
          legalNameAr: pick(v.legalName?.ar, "legalNameAr"),
          tradeName: pick(v.tradeName, "tradeName"),
          companyType: pick(v.companyType, "companyType", storedType || "trading_company"),
          crNumber: pick(v.crNumber, "crNumber"),
          vatNumber: pick(v.vatNumber, "vatNumber"),
          yearEstablished: pick(v.yearEstablished ? String(v.yearEstablished) : "", "yearEstablished"),
          website: pick(v.website, "website"),
          email: pick(v.email, "email"),
          phone: pick(v.phone, "phone"),
          whatsapp: pick(v.whatsapp, "whatsapp"),
          country: pick(v.location?.country, "country", "SA"),
          region: pick(v.location?.region, "region", "Riyadh"),
          city: pick(v.location?.city, "city", storedCity || "Riyadh"),
          address: pick(v.location?.address, "address"),
          postalCode: pick(v.location?.postalCode, "postalCode"),
          descriptionEn: pick(v.description?.en, "descriptionEn"),
          descriptionAr: pick(v.description?.ar, "descriptionAr"),
          marketsServed: pick((v.marketsServed || []).join(", "), "marketsServed"),
          paymentTerms: pick(v.paymentTerms, "paymentTerms"),
          leadTime: pick(v.leadTime, "leadTime"),
          moq: pick(v.moq, "moq"),
          authorizedRep: pick(v.legal?.authorizedRepresentative, "authorizedRep"),
        });
        setLogo(v.logo || "");
        if (docCount > 0) {
          const src = fromDocs?.meta?.sourceFileName || "your documents";
          setAiMessage(`Pre-filled from ${src}. Review CR, VAT and legal name before saving.`);
        }
      })
      .catch(() => {
        if (docCount > 0) {
          applyExtractedFields(docFields);
          const src = fromDocs?.meta?.sourceFileName || "your documents";
          setAiMessage(`Pre-filled from ${src}. Review CR, VAT and legal name before saving.`);
        }
        setForm((prev) => ({
          ...prev,
          ...(storedType ? { companyType: storedType } : {}),
          ...(storedCity ? { city: storedCity } : {}),
        }));
      });
  }, []);

  async function onAiFromUrl(e) {
    e.preventDefault();
    const url = aiUrl.trim() || form.website.trim();
    if (!url) {
      setError("Enter a company website URL to auto-fill");
      return;
    }
    setAiBusy(true);
    setError("");
    setAiMessage("");
    try {
      const data = await extractFromWebsite(url);
      const merged = { ...(data.fields || {}) };
      if (!merged.website) merged.website = data.sourceUrl || url;
      const n = applyExtractedFields(merged);
      setAiMessage(
        `Filled ${data.filledFields || n} fields from website${data.usedAi ? " (AI)" : ""}. Review before saving.`
      );
    } catch (err) {
      setError(err.message || "Could not read website");
    } finally {
      setAiBusy(false);
    }
  }

  async function onAiFromFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAiBusy(true);
    setError("");
    setAiMessage("");
    try {
      const data = await extractFromFile(file);
      const n = applyExtractedFields(data.fields || {});
      setAiMessage(
        `Filled ${data.filledFields || n} fields from ${file.name}${data.usedAi ? " (AI)" : ""}. Review before saving.`
      );
    } catch (err) {
      setError(err.message || "Could not read file");
    } finally {
      setAiBusy(false);
    }
  }

  async function onSave(e) {
    e.preventDefault();
    if (!form.legalNameEn.trim()) {
      setError("Legal company name (EN) is required");
      return;
    }
    if (!form.crNumber.trim()) {
      setError("Commercial Registration (CR) number is required");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const markets = form.marketsServed
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await updateMyVendor({
        legalName: { en: form.legalNameEn.trim(), ar: form.legalNameAr.trim() },
        tradeName: form.tradeName.trim() || form.legalNameEn.trim(),
        companyType: form.companyType,
        crNumber: form.crNumber.trim(),
        vatNumber: form.vatNumber.trim() || undefined,
        yearEstablished: form.yearEstablished ? Number(form.yearEstablished) : undefined,
        website: form.website.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        whatsapp: form.whatsapp.trim() || undefined,
        description: { en: form.descriptionEn, ar: form.descriptionAr },
        location: {
          country: form.country || "SA",
          region: form.region,
          city: form.city.trim(),
          address: form.address.trim(),
          postalCode: form.postalCode.trim(),
        },
        marketsServed: markets,
        paymentTerms: form.paymentTerms.trim() || undefined,
        leadTime: form.leadTime.trim() || undefined,
        moq: form.moq.trim() || undefined,
        legal: {
          authorizedRepresentative: form.authorizedRep.trim() || undefined,
          registrationCountry: "SA",
        },
        logo: logo || undefined,
      });
      router.push("/register/review");
    } catch (err) {
      setError(err.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <OnboardingShell title="Company basics">
      <form onSubmit={onSave} className="space-y-8">
        <p className="m-0 text-sm text-muted">
          Review details we read from your uploaded documents, then complete anything missing. Fields marked * are
          required to continue.
        </p>

        <section className="space-y-3 rounded-xl border border-gold/30 bg-gold-muted/40 p-4">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 shrink-0 text-gold" size={18} />
            <div>
              <h2 className="m-0 text-sm font-semibold text-text">Filled from your documents</h2>
              <p className="mt-1 mb-0 text-xs text-muted">
                We read business name (Arabic + English), VAT/GST, CR, email and contact info from CR, certificates,
                brochures or images. Re-upload a clearer file below if anything was missed. Always check before saving.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="block text-sm text-muted sm:col-span-1">
              Website URL
              <input
                className="input-field mt-1"
                type="url"
                placeholder="https://www.yourcompany.com"
                value={aiUrl}
                onChange={(e) => setAiUrl(e.target.value)}
                disabled={aiBusy}
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                className="btn-primary w-full sm:w-auto"
                onClick={onAiFromUrl}
                disabled={aiBusy}
              >
                {aiBusy ? "Reading…" : "Read website"}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png,.webp,.gif,application/pdf,image/jpeg,image/png,image/webp,image/gif,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={onAiFromFile}
              disabled={aiBusy}
            />
            <button
              type="button"
              className="btn-outline"
              disabled={aiBusy}
              onClick={() => fileRef.current?.click()}
            >
              {aiBusy ? "Reading file…" : "Upload brochure, PDF or image"}
            </button>
            <span className="text-xs text-muted">
              CR, VAT/GST, brochure, letterhead or company profile — PDF / JPG / PNG / Excel
            </span>
          </div>

          {aiMessage ? <p className="m-0 text-sm text-gold">{aiMessage}</p> : null}
        </section>

        <section className="space-y-3">
          <h2 className="m-0 text-xs font-semibold uppercase tracking-wide text-gold">Identity</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-muted sm:col-span-2">
              Legal company name (EN) *
              <input
                className="input-field mt-1"
                value={form.legalNameEn}
                onChange={(e) => set("legalNameEn", e.target.value)}
                required
              />
            </label>
            <label className="block text-sm text-muted sm:col-span-2">
              Legal company name (AR)
              <input
                className="input-field mt-1"
                dir="rtl"
                value={form.legalNameAr}
                onChange={(e) => set("legalNameAr", e.target.value)}
              />
            </label>
            <label className="block text-sm text-muted">
              Trading / brand name
              <input className="input-field mt-1" value={form.tradeName} onChange={(e) => set("tradeName", e.target.value)} />
            </label>
            <label className="block text-sm text-muted">
              Company type
              <select
                className="input-field mt-1"
                value={form.companyType}
                onChange={(e) => set("companyType", e.target.value)}
              >
                {COMPANY_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-muted">
              Year established
              <input
                type="number"
                min="1900"
                max="2100"
                className="input-field mt-1"
                value={form.yearEstablished}
                onChange={(e) => set("yearEstablished", e.target.value)}
              />
            </label>
            <label className="block text-sm text-muted">
              Authorized representative
              <input
                className="input-field mt-1"
                value={form.authorizedRep}
                onChange={(e) => set("authorizedRep", e.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="m-0 text-xs font-semibold uppercase tracking-wide text-gold">Registration numbers</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-muted">
              Commercial Registration (CR) *
              <input
                className="input-field mt-1"
                value={form.crNumber}
                onChange={(e) => set("crNumber", e.target.value)}
                required
                placeholder="10-digit CR number"
              />
            </label>
            <label className="block text-sm text-muted">
              VAT number
              <input
                className="input-field mt-1"
                value={form.vatNumber}
                onChange={(e) => set("vatNumber", e.target.value)}
                placeholder="15-digit VAT if applicable"
              />
            </label>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="m-0 text-xs font-semibold uppercase tracking-wide text-gold">Contact & location</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-muted">
              Business email
              <input
                type="email"
                className="input-field mt-1"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </label>
            <label className="block text-sm text-muted">
              Website
              <input className="input-field mt-1" value={form.website} onChange={(e) => set("website", e.target.value)} />
            </label>
            <label className="block text-sm text-muted">
              Phone
              <input className="input-field mt-1" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </label>
            <label className="block text-sm text-muted">
              WhatsApp
              <input className="input-field mt-1" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
            </label>
            <label className="block text-sm text-muted">
              Region
              <select className="input-field mt-1" value={form.region} onChange={(e) => set("region", e.target.value)}>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-muted">
              City *
              <input className="input-field mt-1" value={form.city} onChange={(e) => set("city", e.target.value)} required />
            </label>
            <label className="block text-sm text-muted sm:col-span-2">
              Street address / national address
              <input className="input-field mt-1" value={form.address} onChange={(e) => set("address", e.target.value)} />
            </label>
            <label className="block text-sm text-muted">
              Postal code
              <input className="input-field mt-1" value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
            </label>
            <label className="block text-sm text-muted">
              Country
              <input className="input-field mt-1" value="Saudi Arabia" disabled />
            </label>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="m-0 text-xs font-semibold uppercase tracking-wide text-gold">About the business</h2>
          <label className="block text-sm text-muted">
            Company description (EN)
            <textarea
              className="input-field mt-1 min-h-28"
              value={form.descriptionEn}
              onChange={(e) => set("descriptionEn", e.target.value)}
              placeholder="What you supply, industries served, strengths…"
            />
          </label>
          <label className="block text-sm text-muted">
            Company description (AR)
            <textarea
              className="input-field mt-1 min-h-24"
              dir="rtl"
              value={form.descriptionAr}
              onChange={(e) => set("descriptionAr", e.target.value)}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-muted sm:col-span-2">
              Markets served (comma separated)
              <input
                className="input-field mt-1"
                value={form.marketsServed}
                onChange={(e) => set("marketsServed", e.target.value)}
                placeholder="KSA, GCC, export"
              />
            </label>
            <label className="block text-sm text-muted">
              Typical MOQ
              <input className="input-field mt-1" value={form.moq} onChange={(e) => set("moq", e.target.value)} />
            </label>
            <label className="block text-sm text-muted">
              Lead time
              <input className="input-field mt-1" value={form.leadTime} onChange={(e) => set("leadTime", e.target.value)} />
            </label>
            <label className="block text-sm text-muted sm:col-span-2">
              Payment terms
              <input
                className="input-field mt-1"
                value={form.paymentTerms}
                onChange={(e) => set("paymentTerms", e.target.value)}
                placeholder="e.g. Net 30, LC, advance"
              />
            </label>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="m-0 text-xs font-semibold uppercase tracking-wide text-gold">Logo</h2>
          <FileUploader
            kind="company_logo"
            label="Company logo"
            previewUrl={logo ? mediaAbsoluteUrl(logo) : ""}
            onUploaded={(file) => setLogo(file?.url || "")}
          />
        </section>

        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <button type="submit" className="btn-primary" disabled={busy || aiBusy}>
            {busy ? "Saving…" : "Save & continue"}
          </button>
        </div>
      </form>
    </OnboardingShell>
  );
}
