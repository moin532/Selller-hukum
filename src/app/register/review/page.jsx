"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingShell } from "@/components/marketing/OnboardingShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fetchMyVendor, submitForVerification } from "@/services/company-api";
import { localized } from "@/lib/utils";

function Row({ label, value }) {
  return (
    <div className="grid gap-1 border-b border-border py-2.5 sm:grid-cols-[180px_1fr]">
      <dt className="text-muted">{label}</dt>
      <dd className="m-0 font-medium text-text">{value || "—"}</dd>
    </div>
  );
}

export default function RegisterReviewPage() {
  const router = useRouter();
  const [vendor, setVendor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMyVendor()
      .then(setVendor)
      .catch((e) => setError(e.message || "Failed to load"));
  }, []);

  async function onSubmit() {
    setBusy(true);
    setError("");
    try {
      await submitForVerification();
      router.push("/register/submitted");
    } catch (err) {
      setError(err.message || "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <OnboardingShell title="Review & submit">
      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
      {!vendor ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <StatusBadge value={vendor.verificationStatus} />
            <StatusBadge value={vendor.status} />
          </div>

          <dl className="m-0">
            <Row label="Legal name" value={localized(vendor.legalName, vendor.tradeName)} />
            <Row label="Trade name" value={vendor.tradeName} />
            <Row label="Company type" value={vendor.companyType} />
            <Row label="CR number" value={vendor.crNumber} />
            <Row label="VAT number" value={vendor.vatNumber} />
            <Row label="Year established" value={vendor.yearEstablished} />
            <Row label="Email" value={vendor.email} />
            <Row label="Phone" value={vendor.phone} />
            <Row label="WhatsApp" value={vendor.whatsapp} />
            <Row label="Website" value={vendor.website} />
            <Row
              label="Location"
              value={[vendor.location?.address, vendor.location?.city, vendor.location?.region, vendor.location?.country]
                .filter(Boolean)
                .join(", ")}
            />
            <Row label="Markets" value={(vendor.marketsServed || []).join(", ")} />
            <Row label="MOQ / lead time" value={[vendor.moq, vendor.leadTime].filter(Boolean).join(" · ")} />
            <Row label="Payment terms" value={vendor.paymentTerms} />
            <Row label="Representative" value={vendor.legal?.authorizedRepresentative} />
            <Row label="Description" value={localized(vendor.description, "")} />
          </dl>

          <p className="text-sm text-muted">
            Submitting requests Super Admin verification. You will not be marked verified until an administrator
            approves.
          </p>
          <button type="button" className="btn-primary" disabled={busy} onClick={onSubmit}>
            {busy ? "Submitting…" : "Submit for verification"}
          </button>
        </div>
      )}
    </OnboardingShell>
  );
}
