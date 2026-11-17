import { apiGet, apiPost } from "@/lib/api-client";

export async function fetchVendorRfqs() {
  const { json } = await apiGet("/api/rfqs?scope=vendor");
  if (!json.success) throw new Error(json.message || "Failed to load RFQs");
  return Array.isArray(json.data) ? json.data : [];
}

export async function fetchRfqDetail(id) {
  const { json } = await apiGet(`/api/rfqs?id=${encodeURIComponent(id)}`);
  if (!json.success) throw new Error(json.message || "RFQ not found");
  return json.data;
}

export async function respondToInvitation(rfqId, status) {
  const { json } = await apiPost("/api/rfqs", {
    action: "vendor_respond",
    rfqId,
    status,
  });
  if (!json.success) throw new Error(json.message || "Response failed");
  return json.data;
}
