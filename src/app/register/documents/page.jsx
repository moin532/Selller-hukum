"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileSearch, Sparkles } from "lucide-react";
import { OnboardingShell } from "@/components/marketing/OnboardingShell";
import { FileUploader } from "@/components/ui/FileUploader";
import {
  loadExtractedFields,
  saveExtractedFields,
  shouldExtractFromDocType,
  vendorUpdatesFromExtracted,
} from "@/lib/onboarding-from-docs";
import { updateMyVendor } from "@/services/company-api";
import { extractFromFile } from "@/services/onboarding-ai-api";

const DOC_TYPES = [
  { id: "commercial_registration", label: "Commercial Registration (CR)", required: true },
  { id: "vat_certificate", label: "VAT / GST certificate", required: false },
  { id: "national_address", label: "National address certificate", required: false },
  { id: "brochure", label: "Company brochure / profile", required: false },
  { id: "other", label: "Other (letterhead, card, invoice…)", required: false },
];

export default function RegisterDocumentsPage() {
  const router = useRouter();
  const [uploads, setUploads] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [reading, setReading] = useState("");
  const [filledCount, setFilledCount] = useState(0);

  const hasCr = uploads.some((u) => u.docType === "commercial_registration");

  async function onDocUploaded(d, fileMeta, _data, rawFile) {
    setUploads((prev) => [...prev.filter((x) => x.docType !== d.id), { ...fileMeta, docType: d.id }]);
    setError("");
    setMessage(`${d.label} uploaded.`);

    if (!rawFile || !shouldExtractFromDocType(d.id)) return;

    setReading(d.label);
    try {
      const data = await extractFromFile(rawFile);
      const fields = data.fields || {};
      // Merge into session — re-upload must not wipe business name / email already read
      saveExtractedFields(fields, {
        sourceDocType: d.id,
        sourceFileName: rawFile.name,
        usedAi: Boolean(data.usedAi),
      });
      const merged = loadExtractedFields()?.fields || fields;
      const n = Object.keys(merged).filter((k) => merged[k] != null && String(merged[k]).trim()).length;
      setFilledCount(n);

      const patch = vendorUpdatesFromExtracted(merged);
      if (patch) {
        try {
          await updateMyVendor(patch);
        } catch {
          /* sessionStorage still holds fields for company step */
        }
      }

      setMessage(
        `${d.label} uploaded. We read ${data.filledFields || n} company field${
          (data.filledFields || n) === 1 ? "" : "s"
        }${data.usedAi ? " (AI)" : ""} — review them on the next step.`
      );
    } catch (err) {
      setMessage(
        `${d.label} uploaded. We could not auto-read this file (${
          err.message || "unreadable"
        }). You can still enter company details manually next.`
      );
    } finally {
      setReading("");
    }
  }

  function onContinue() {
    setError("");
    if (!hasCr) {
      setError("Upload Commercial Registration (CR) so we can fill company basics, or skip and enter details manually.");
      return;
    }
    router.push("/register/company");
  }

  return (
    <OnboardingShell title="Documents">
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl border border-gold/30 bg-gold-muted/40 p-4">
          <Sparkles className="mt-0.5 shrink-0 text-gold" size={18} aria-hidden />
          <div>
            <p className="m-0 text-sm font-semibold text-text">Company basics from your documents</p>
            <p className="mt-1 mb-0 text-xs text-muted">
              Upload CR, VAT/GST, national address, brochure, or any company image/PDF. We read Arabic and English —
              business name, VAT/GST, CR, email, phone, address — and pre-fill the next step. Always review before
              submitting.
            </p>
          </div>
        </div>

        <p className="m-0 text-sm text-muted">
          Files are stored privately for Super Admin review. Uploading does <strong>not</strong> auto-verify your
          company.
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          {DOC_TYPES.map((d) => (
            <div key={d.id} className="rounded-xl border border-border bg-surface p-4">
              <FileUploader
                kind="document"
                label={`${d.label}${d.required ? " *" : ""}`}
                accept="application/pdf,image/jpeg,image/png,image/webp,image/gif,.pdf,.jpg,.jpeg,.png,.webp"
                docType={d.id}
                onUploaded={(fileMeta, data, rawFile) => onDocUploaded(d, fileMeta, data, rawFile)}
              />
              <p className="mt-2 mb-0 flex items-center gap-1.5 text-[11px] text-muted">
                <FileSearch size={12} aria-hidden />
                We read name, VAT/GST, CR and contact info from this file
              </p>
            </div>
          ))}
        </div>

        {reading ? (
          <p className="m-0 text-sm text-gold" role="status">
            Reading {reading} for company details…
          </p>
        ) : null}

        {uploads.length ? (
          <ul className="space-y-1 text-sm text-muted">
            {uploads.map((u) => (
              <li key={u.documentId || `${u.docType}-${u.name}`}>
                ✓ {u.docType}: {u.name || "file"}
              </li>
            ))}
          </ul>
        ) : null}

        {filledCount > 0 ? (
          <p className="m-0 text-sm text-gold">
            Ready: {filledCount} company field{filledCount === 1 ? "" : "s"} will appear on Company basics.
          </p>
        ) : null}

        {message ? <p className="text-sm text-gold">{message}</p> : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <button type="button" className="btn-primary" onClick={onContinue} disabled={Boolean(reading)}>
            {filledCount ? "Review company basics" : "Continue to company basics"}
          </button>
          <button
            type="button"
            className="btn-outline"
            disabled={Boolean(reading)}
            onClick={() => router.push("/register/company")}
          >
            Skip for now
          </button>
        </div>
      </div>
    </OnboardingShell>
  );
}
