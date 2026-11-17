import { apiGet, apiPatch, apiPost } from "@/lib/api-client";
import { getSellerToken, getSellerUser, setSellerSession } from "@/lib/session";

function syncVendorIdToSession(vendor) {
  const id = vendor?._sessionVendorId || vendor?._id;
  if (!id) return vendor;
  const user = getSellerUser();
  const token = getSellerToken();
  if (user && token && String(user.vendorId || "") !== String(id)) {
    setSellerSession({ ...user, vendorId: String(id) }, token);
  }
  return vendor;
}

export async function fetchMyVendor() {
  const { json, status } = await apiGet("/api/vendors?mine=true");
  if (!json.success) {
    throw new Error(json.message || (status === 404 ? "Vendor profile not found" : "Failed to load company"));
  }
  if (!json.data) {
    throw new Error("Vendor profile not found. Complete company registration first.");
  }
  return syncVendorIdToSession(json.data);
}

export async function updateMyVendor(updates) {
  const { json } = await apiPatch("/api/vendors", { updates });
  if (!json.success) throw new Error(json.message || "Failed to save company");
  return json.data;
}

export async function submitForVerification() {
  const { json } = await apiPost("/api/vendors", { action: "submit" });
  if (!json.success) throw new Error(json.message || "Submit failed");
  return json.data;
}

/** Queue storefront design for Super Admin approval (does not go live until approved). */
export async function submitStorefrontDesign(design) {
  const { json } = await apiPatch("/api/vendors", {
    updates: { storefrontDesign: design, submitStorefront: true },
  });
  if (!json.success) throw new Error(json.message || "Failed to submit storefront design");
  return json.data;
}
