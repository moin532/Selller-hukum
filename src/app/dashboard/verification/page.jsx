"use client";

import { useEffect, useState } from "react";
import { SellerShell } from "@/components/layout/SellerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FileUploader } from "@/components/ui/FileUploader";
import { fetchMyVendor, submitForVerification } from "@/services/company-api";
import { apiPost } from "@/lib/api-client";

const DOC_TYPES = [
  { id: "commercial_registration", label: "Commercial Registration (CR)" },
  { id: "vat_certificate", label: "VAT certificate" },
  { id: "trade_license", label: "Trade / municipal license" },
  { id: "national_address", label: "National address" },
  { id: "other", label: "Other supporting document" },
];

export default function VerificationPage() {
  const [vendor, setVendor] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [prechecks, setPrechecks] = useState({});

  useEffect(() => {
    fetchMyVendor()
      .then(setVendor)
      .catch((e) => setError(e.message || "Failed to load"));
  }, []);

  async function onSubmit() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await submitForVerification();
      setMessage("Verification submitted. Uploading files does not auto-verify your company.");
      setVendor(await fetchMyVendor());
    } catch (e) {
      setError(e.message || "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SellerShell title="Verification & Documents">
      <PageHeader
        title="Verification & Documents"
        subtitle="Private documents upload to uploads/private/documents/{vendorId}/{docType}/ via /api/uploads."
      />
      <div className="mb-5 rounded-xl border border-border bg-gold-muted px-4 py-3 text-sm text-muted">
        Files are ACL-protected Document records. Admin reviews in Main Admin → Verification. Registration or upload alone
        does not mark you verified.
      </div>
      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
      {message ? <p className="mb-3 text-sm text-gold">{message}</p> : null}

      <section className="mb-6 rounded-xl border border-border bg-card p-5">
        <h2 className="m-0 text-sm font-semibold">Company verification</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusBadge value={vendor?.verificationStatus || "unverified"} />
          <StatusBadge value={vendor?.status || "draft"} />
        </div>
        {vendor?.verificationStatus === "pending" ? (
          <p className="mt-3 mb-0 text-sm text-gold">
            Waiting for Super Admin approval. Product creation and activity submit stay locked until verified.
          </p>
        ) : vendor?.verificationStatus === "verified" ? (
          <p className="mt-3 mb-0 text-sm text-muted">Your company is verified. You can add products.</p>
        ) : vendor?.verificationStatus === "rejected" ? (
          <div className="mt-3">
            <p className="m-0 text-sm text-danger">
              Verification rejected. Fix the issues below, re-upload documents if asked, then resubmit.
            </p>
            {vendor.verificationRejectionReason ? (
              <p className="mt-2 mb-0 rounded-lg border border-border bg-surface p-3 text-sm">
                <strong>Reason:</strong> {vendor.verificationRejectionReason}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 mb-0 text-sm text-muted">
            Submit when your profile and documents are ready. Approval is not automatic.
          </p>
        )}
        {vendor?.verificationStatus !== "verified" ? (
          <button
            type="button"
            className="btn-primary mt-4"
            onClick={onSubmit}
            disabled={busy || vendor?.verificationStatus === "pending"}
          >
            {busy
              ? "Submitting…"
              : vendor?.verificationStatus === "pending"
                ? "Already waiting for approval"
                : vendor?.verificationStatus === "rejected"
                  ? "Resubmit after fixes"
                  : "Submit for review"}
          </button>
        ) : null}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="m-0 text-sm font-semibold">Required documents</h2>
        <p className="mt-1 text-sm text-muted">PDF or image · max 10MB · stored privately (not public media).</p>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          {DOC_TYPES.map((d) => (
            <FileUploader
              key={d.id}
              kind="document"
              label={d.label}
              accept="application/pdf,image/jpeg,image/png,image/webp"
              docType={d.id}
              onUploaded={async (file) => {
                setUploads((prev) => [...prev, { ...file, docType: d.id }]);
                setMessage(`${d.label} uploaded (pending admin review).`);
                try {
                  const { json } = await apiPost("/api/ai/doc-precheck", {
                    type: d.id,
                    fileName: file.name,
                    mimeType: file.mimeType || file.type,
                    sizeBytes: file.size,
                    numberHint: vendor?.crNumber || vendor?.vatNumber,
                  });
                  if (json.success) {
                    setPrechecks((prev) => ({ ...prev, [d.id]: json.data }));
                  }
                } catch {
                  /* optional */
                }
              }}
            />
          ))}
        </div>
        {Object.keys(prechecks).length ? (
          <div className="mt-4 space-y-2">
            {Object.entries(prechecks).map(([type, result]) => (
              <div key={type} className="rounded-lg border border-border bg-surface px-3 py-2 text-xs">
                <p className="m-0 font-semibold text-text">
                  AI pre-check · {type} · score {result.score}/100 {result.ok ? "✓" : "!"}
                </p>
                {(result.flags || []).map((f) => (
                  <p key={f.code} className={`mt-1 mb-0 ${f.severity === "error" ? "text-danger" : "text-muted"}`}>
                    {f.message}
                  </p>
                ))}
              </div>
            ))}
          </div>
        ) : null}
        {uploads.length ? (
          <ul className="mt-4 space-y-1 text-sm text-muted">
            {uploads.map((u) => (
              <li key={u.documentId || u.name}>
                {u.docType}: {u.name} · id {u.documentId || "—"}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </SellerShell>
  );
}
