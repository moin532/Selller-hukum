"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import { OnboardingShell } from "@/components/marketing/OnboardingShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fetchMyVendor } from "@/services/company-api";
import { localized } from "@/lib/utils";

export default function RegisterSubmittedPage() {
  const [vendor, setVendor] = useState(null);

  useEffect(() => {
    fetchMyVendor().then(setVendor).catch(() => {});
  }, []);

  const pending = !vendor || vendor.verificationStatus !== "verified";

  return (
    <OnboardingShell title="Application submitted">
      <div className="space-y-5">
        <div className="verify-card verify-card--waiting">
          <Clock size={22} className="text-gold" />
          <div className="min-w-0 flex-1">
            <h2 className="m-0 text-base font-semibold">
              {pending ? "Waiting for Super Admin approval" : "Company verified"}
            </h2>
            <p className="mt-1 mb-0 text-sm text-muted">
              {pending
                ? "Your seller onboarding is complete. Verification is pending — the dashboard will show this waiting status until an administrator approves your company."
                : "Your company is verified. You can continue to the seller dashboard."}
            </p>
          </div>
        </div>

        {vendor ? (
          <div className="rounded-lg border border-border p-4 text-sm">
            <p className="font-medium">{localized(vendor.legalName, vendor.tradeName)}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusBadge value={vendor.verificationStatus} />
              <StatusBadge value={vendor.status} />
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard" className="btn-primary">
            Go to seller dashboard
          </Link>
          <Link href="/dashboard/verification" className="btn-outline">
            Track verification
          </Link>
        </div>
      </div>
    </OnboardingShell>
  );
}
