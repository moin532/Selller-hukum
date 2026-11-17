import { apiGet, apiPatch } from "@/lib/api-client";
import { fetchMyVendor } from "@/services/company-api";

export async function fetchVendorInquiries() {
  // Repair / ensure vendor linkage before inbox load (fixes stale seller sessions).
  try {
    await fetchMyVendor();
  } catch (e) {
    throw new Error(e.message || "Vendor profile not found. Log out and sign in again.");
  }

  const { json } = await apiGet("/api/contact?scope=vendor&limit=50");
  if (!json.success) throw new Error(json.message || "Failed to load inquiries");
  const contactRows = Array.isArray(json.data) ? json.data : [];

  // Also pull heart-interest leads (same Enquiry collection; ensures visibility if filters diverge).
  let interestRows = [];
  try {
    const interest = await apiGet("/api/product-interest?scope=vendor&limit=50");
    if (interest.json?.success && Array.isArray(interest.json.data)) {
      interestRows = interest.json.data;
    }
  } catch {
    /* optional merge */
  }

  const byId = new Map();
  for (const row of [...contactRows, ...interestRows]) {
    const id = String(row?._id || "");
    if (!id) continue;
    if (!byId.has(id)) byId.set(id, row);
  }
  return Array.from(byId.values()).sort((a, b) => {
    const ta = new Date(a.createdAt || 0).getTime();
    const tb = new Date(b.createdAt || 0).getTime();
    return tb - ta;
  });
}

export async function updateInquiryStatus(id, status) {
  const { json } = await apiPatch("/api/contact", { id, status });
  if (!json.success) throw new Error(json.message || "Failed to update inquiry");
  return json.data;
}
