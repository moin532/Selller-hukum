import { apiGet, apiPost } from "@/lib/api-client";
import { getSellerToken } from "@/lib/session";
import { apiUrl } from "@/lib/api-client";

/** Documents already uploaded for this seller's company (verification page). */
export async function fetchMyDocuments() {
  const { json } = await apiGet("/api/documents?mine=1");
  if (!json.success) throw new Error(json.message || "Failed to load documents");
  return Array.isArray(json.data) ? json.data : [];
}

/** List documents owned by vendor — admin list is not used; seller creates private notes via documents API. */
export async function createPrivateNote(content, name = "verification-note.txt") {
  const { json } = await apiPost("/api/documents", {
    action: "create_private_text",
    content,
    name,
    visibility: "private",
    ownerType: "vendor",
  });
  if (!json.success) throw new Error(json.message || "Upload helper failed");
  return json.data;
}

export async function downloadDocument(id) {
  const token = getSellerToken();
  const res = await fetch(apiUrl(`/api/documents?id=${encodeURIComponent(id)}&download=1`), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let msg = `Download failed (${res.status})`;
    try {
      const j = await res.json();
      if (j?.message) msg = j.message;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.blob();
}

export async function fetchDocumentMeta(id) {
  const { json } = await apiGet(`/api/documents?id=${encodeURIComponent(id)}`);
  if (!json.success) throw new Error(json.message || "Not found");
  return json.data;
}
