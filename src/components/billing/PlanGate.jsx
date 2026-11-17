"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api-client";

/**
 * Soft plan gate banner. feature: aiCatalogue | demandRadar | viewersConsent | customDomain | fullCrm
 */
export function PlanGate({ feature, children, minPlan = "gold" }) {
  const [state, setState] = useState({ loading: true, allowed: true, planKey: "free" });

  useEffect(() => {
    apiGet("/api/monetisation?resource=me")
      .then(({ json }) => {
        if (!json.success || !json.data) {
          setState({ loading: false, allowed: false, planKey: "free" });
          return;
        }
        const e = json.data.entitlements || {};
        let allowed = true;
        if (feature === "aiCatalogue") allowed = Boolean(e.aiCatalogue);
        else if (feature === "demandRadar") allowed = Boolean(e.demandRadar);
        else if (feature === "viewersConsent") allowed = Boolean(e.viewersConsent);
        else if (feature === "customDomain") allowed = Boolean(e.customDomain);
        else if (feature === "fullCrm") allowed = e.crm === "full" || e.crm === "full_team";
        else if (feature === "analyticsBenchmarks") {
          allowed = e.analytics === "benchmarks" || e.analytics === "full";
        }
        setState({ loading: false, allowed, planKey: json.data.planKey || "free" });
      })
      .catch(() => setState({ loading: false, allowed: true, planKey: "free" }));
  }, [feature]);

  if (state.loading) return children;

  if (!state.allowed) {
    return (
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-6 text-sm">
        <p className="m-0 font-semibold text-text">
          {minPlan === "premium" ? "Premium" : "Gold"} plan required
        </p>
        <p className="mt-2 mb-4 text-muted">
          Your current plan is <span className="capitalize">{state.planKey}</span>. Upgrade to unlock this
          feature.
        </p>
        <Link href="/dashboard/pricing" className="inline-flex rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-white">
          View plans
        </Link>
      </div>
    );
  }

  return children;
}
