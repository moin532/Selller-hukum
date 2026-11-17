"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { OnboardingShell } from "@/components/marketing/OnboardingShell";
import { FileUploader } from "@/components/ui/FileUploader";

const DOC_TYPES = [
  { id: "commercial_registration", label: "Commercial Registration (CR)", required: true },
  { id: "vat_certificate", label: "VAT certificate", required: false },
  { id: "national_address", label: "National address certificate", required: false },
  { id: "other", label: "Other supporting document", required: false },
];

export default function RegisterDocumentsPage() {
  const router = useRouter();
  const [uploads, setUploads] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const hasCr = uploads.some((u) => u.docType === "commercial_registration");

  function onContinue() {
    setError("");
    if (!hasCr) {
      setError("Upload Commercial Registration (CR) to continue, or skip and upload later from Verification.");
      return;
    }
    router.push("/register/review");
  }

  return (
    <OnboardingShell title="Documents">
      <div className="space-y-5">
        <p className="m-0 text-sm text-muted">
          Upload verification documents. Files are stored privately and reviewed by Super Admin. Uploading does{" "}
          <strong>not</strong> auto-verify your company.
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          {DOC_TYPES.map((d) => (
            <div key={d.id} className="rounded-xl border border-border bg-surface p-4">
              <FileUploader
                kind="document"
                label={`${d.label}${d.required ? " *" : ""}`}
                accept="application/pdf,image/jpeg,image/png,image/webp"
                docType={d.id}
                onUploaded={(file) => {
                  setUploads((prev) => [...prev.filter((x) => x.docType !== d.id), { ...file, docType: d.id }]);
                  setMessage(`${d.label} uploaded.`);
                  setError("");
                }}
              />
            </div>
          ))}
        </div>

        {uploads.length ? (
          <ul className="space-y-1 text-sm text-muted">
            {uploads.map((u) => (
              <li key={u.documentId || `${u.docType}-${u.name}`}>
                ✓ {u.docType}: {u.name || "file"}
              </li>
            ))}
          </ul>
        ) : null}

        {message ? <p className="text-sm text-gold">{message}</p> : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <button type="button" className="btn-primary" onClick={onContinue}>
            Continue to review
          </button>
          <button type="button" className="btn-outline" onClick={() => router.push("/register/review")}>
            Skip for now
          </button>
          <Link href="/dashboard/verification" className="btn-outline">
            Open verification center
          </Link>
        </div>
      </div>
    </OnboardingShell>
  );
}
