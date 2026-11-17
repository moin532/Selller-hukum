import { apiGet } from "@/lib/api-client";

/** Server-side seller rollup — scoped to session.vendorId. */
export async function fetchSellerAnalyticsRollup({
  range = "30d",
  granularity = "day",
  compare = true,
  from = "",
  to = "",
} = {}) {
  const params = new URLSearchParams({
    range,
    granularity,
    compare: compare ? "1" : "0",
  });
  if (from && to) {
    params.set("from", from);
    params.set("to", to);
  }
  const { json } = await apiGet(`/api/seller-analytics?${params.toString()}`);
  if (!json.success) throw new Error(json.message || "Failed to load analytics");
  return json.data;
}

/** @deprecated Prefer fetchSellerAnalyticsRollup — kept for overview fallback. */
export async function fetchSellerMetrics() {
  return fetchSellerAnalyticsRollup({ range: "30d", granularity: "day", compare: true });
}
