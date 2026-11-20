"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  CheckCircle2,
  FileText,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { SellerShell } from "@/components/layout/SellerShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FileUploader } from "@/components/ui/FileUploader";
import { fetchMyVendor, submitForVerification } from "@/services/company-api";
import { fetchMyDocuments } from "@/services/verification-api";
import { apiPost } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

const DOC_TYPES = [
  { id: "commercial_registration", label: "Commercial Registration (CR)", required: true },
  { id: "vat_certificate", label: "VAT certificate", required: true },
  { id: "business_license", label: "Trade / municipal license", required: false },
  { id: "national_address", label: "National address", required: false },
  { id: "other", label: "Other supporting document", required: false },
];

function formatBytes(n) {
  const size = Number(n) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function VerificationPage() {
  const [vendor, setVendor] = useState(null);
  const [docs, setDocs] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [prechecks, setPrechecks] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [v, list] = await Promise.all([
        fetchMyVendor(),
        fetchMyDocuments().catch(() => []),
      ]);
      setVendor(v);
      setDocs(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byType = useMemo(() => {
    const map = {};
    for (const d of docs) {
      const key = d.type || "other";
      if (!map[key]) map[key] = d;
    }
    return map;
  }, [docs]);

  const coveredRequired = DOC_TYPES.filter((d) => d.required).every((d) => byType[d.id]);
  const status = vendor?.verificationStatus || "unverified";

  async function onSubmit() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await submitForVerification();
      setMessage("Verification submitted. Uploading files does not auto-verify your company.");
      await load();
    } catch (e) {
      setError(e.message || "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SellerShell title="Verification">
      <section className="relative mb-6 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-[#103528] via-[#17634b] to-[#1f4f3c] px-5 py-6 text-white sm:px-7">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 10%, #c9a962 0, transparent 35%), radial-gradient(circle at 90% 80%, #fff 0, transparent 25%)",
          }}
          aria-hidden
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <p className="m-0 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f0e2c0]">
              <ShieldCheck size={12} aria-hidden /> Trust
            </p>
            <h1 className="mt-3 mb-0 text-2xl font-semibold tracking-tight">Verification & documents</h1>
            <p className="mt-2 mb-0 text-sm leading-relaxed text-white/80">
              Upload CR and VAT privately. Admin reviews them — registration alone does not make you verified.
            </p>
          </div>
          <div className="relative flex flex-wrap items-center gap-2">
            <StatusBadge value={status} />
            <StatusBadge value={vendor?.status || "draft"} />
          </div>
        </div>
      </section>

      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
      {message ? <p className="mb-3 text-sm text-gold">{message}</p> : null}

      <section className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_10px_28px_-22px_rgba(16,37,28,0.4)]">
          <h2 className="m-0 flex items-center gap-2 text-sm font-semibold text-text">
            <BadgeCheck size={16} className="text-gold" aria-hidden />
            Company verification
          </h2>
          {status === "pending" ? (
            <p className="mt-3 mb-0 text-sm text-gold">
              Waiting for Super Admin approval. Product creation stays locked until verified.
            </p>
          ) : status === "verified" ? (
            <p className="mt-3 mb-0 text-sm text-muted">Your company is verified. You can add products.</p>
          ) : status === "rejected" ? (
            <div className="mt-3">
              <p className="m-0 text-sm text-danger">
                Verification rejected. Fix the issues below, re-upload if asked, then resubmit.
              </p>
              {vendor?.verificationRejectionReason ? (
                <p className="mt-2 mb-0 rounded-xl border border-border bg-surface p-3 text-sm">
                  <strong>Reason:</strong> {vendor.verificationRejectionReason}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 mb-0 text-sm text-muted">
              Submit when your profile and documents are ready. Approval is not automatic.
            </p>
          )}

          {status !== "verified" ? (
            <button
              type="button"
              className="btn-primary mt-4"
              onClick={onSubmit}
              disabled={busy || status === "pending" || !coveredRequired}
              title={!coveredRequired ? "Upload required CR and VAT first" : undefined}
            >
              {busy
                ? "Submitting…"
                : status === "pending"
                  ? "Already waiting for approval"
                  : status === "rejected"
                    ? "Resubmit after fixes"
                    : coveredRequired
                      ? "Submit for review"
                      : "Upload CR & VAT first"}
            </button>
          ) : null}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="m-0 text-sm font-semibold text-text">Checklist</h2>
          <ul className="mt-3 mb-0 space-y-2.5">
            {DOC_TYPES.filter((d) => d.required || byType[d.id]).map((d) => {
              const existing = byType[d.id];
              return (
                <li key={d.id} className="flex items-start gap-2.5 text-sm">
                  <span
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                      existing ? "bg-gold text-white" : "bg-surface text-muted"
                    }`}
                  >
                    {existing ? <CheckCircle2 size={12} aria-hidden /> : <span className="text-[10px]">·</span>}
                  </span>
                  <div className="min-w-0">
                    <p className="m-0 font-medium text-text">
                      {d.label}
                      {d.required ? " *" : ""}
                    </p>
                    <p className="mt-0.5 mb-0 text-xs text-muted">
                      {existing
                        ? `${existing.name} · ${existing.approvalStatus || "pending"}`
                        : "Not uploaded yet"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 mb-0 text-xs text-muted">
            {docs.length} document{docs.length === 1 ? "" : "s"} on file
            {coveredRequired ? " · required set complete" : ""}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="m-0 text-sm font-semibold text-text">Required documents</h2>
            <p className="mt-1 mb-0 text-sm text-muted">
              PDF or image · max 10MB · stored privately. Already uploaded files stay visible below.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted">
            <UploadCloud size={12} aria-hidden /> Private ACL
          </span>
        </div>

        {loading ? (
          <p className="text-sm text-muted">Loading documents…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {DOC_TYPES.map((d) => {
              const existing = byType[d.id];
              return (
                <div
                  key={d.id}
                  className={`rounded-2xl border p-4 transition ${
                    existing
                      ? "border-gold/30 bg-gradient-to-b from-gold-muted/50 to-card"
                      : "border-border bg-surface/50"
                  }`}
                >
                  {existing ? (
                    <div className="mb-3 flex items-start gap-3 rounded-xl border border-border/70 bg-card px-3 py-2.5">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold-muted text-gold">
                        <FileText size={18} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="m-0 truncate text-sm font-semibold text-text">{existing.name}</p>
                        <p className="mt-0.5 mb-0 text-[11px] text-muted">
                          {formatBytes(existing.size)}
                          {existing.createdAt ? ` · ${formatDate(existing.createdAt)}` : ""}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <StatusBadge value={existing.approvalStatus || "pending"} />
                          <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                            Uploaded
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <FileUploader
                    kind="document"
                    label={`${d.label}${d.required ? " *" : ""}${existing ? " — replace" : ""}`}
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    docType={d.id}
                    onUploaded={async (file) => {
                      if (!file) return;
                      setMessage(`${d.label} uploaded (pending admin review).`);
                      await load();
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
                </div>
              );
            })}
          </div>
        )}

        {Object.keys(prechecks).length ? (
          <div className="mt-4 space-y-2">
            {Object.entries(prechecks).map(([type, result]) => (
              <div key={type} className="rounded-xl border border-border bg-surface px-3 py-2 text-xs">
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

        {docs.length > 0 ? (
          <div className="mt-6 border-t border-border pt-5">
            <h3 className="m-0 text-xs font-semibold uppercase tracking-wide text-muted">All uploaded files</h3>
            <ul className="mt-3 mb-0 space-y-2">
              {docs.map((u) => (
                <li
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface/60 px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="m-0 truncate font-medium text-text">{u.name}</p>
                    <p className="mt-0.5 mb-0 text-[11px] text-muted">
                      {u.type?.replace(/_/g, " ")} · {formatBytes(u.size)}
                      {u.createdAt ? ` · ${formatDate(u.createdAt)}` : ""}
                    </p>
                  </div>
                  <StatusBadge value={u.approvalStatus || "pending"} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </SellerShell>
  );
}
