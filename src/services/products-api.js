import { apiGet, apiPatch, apiPost } from "@/lib/api-client";

export async function fetchMyProducts({ status = "", page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({
    mine: "true",
    page: String(page),
    limit: String(limit),
  });
  if (status) params.set("status", status);
  const { json } = await apiGet(`/api/products?${params}`);
  if (!json.success) throw new Error(json.message || "Failed to load products");
  return json.data;
}

export async function fetchProduct(id) {
  const { json } = await apiGet(`/api/products?id=${encodeURIComponent(id)}`);
  if (!json.success) throw new Error(json.message || "Product not found");
  return json.data;
}

export async function createProduct(body) {
  const { json } = await apiPost("/api/products", body);
  if (!json.success) throw new Error(json.message || "Create failed");
  return json.data;
}

export async function updateProduct(id, updates) {
  const { json } = await apiPatch("/api/products", { id, updates });
  if (!json.success) throw new Error(json.message || "Update failed");
  return json.data;
}

/** Submit draft for Super Admin review (status → submitted + notify admins). */
export async function submitProduct(id, updates = {}) {
  const { json } = await apiPatch("/api/products", {
    id,
    action: "submit",
    ...updates,
    status: "submitted",
  });
  if (!json.success) throw new Error(json.message || "Submit failed");
  return json.data;
}

export async function unpublishProduct(id) {
  const { json } = await apiPatch("/api/products", { id, action: "unpublish" });
  if (!json.success) throw new Error(json.message || "Unpublish failed");
  return json.data;
}

export async function archiveProduct(id) {
  const { json } = await apiPatch("/api/products", { id, action: "archive" });
  if (!json.success) throw new Error(json.message || "Archive failed");
  return json.data;
}

export async function deleteProduct(id) {
  const { json } = await apiPatch("/api/products", { id, action: "delete" });
  if (!json.success) throw new Error(json.message || "Delete failed");
  return json.data;
}
