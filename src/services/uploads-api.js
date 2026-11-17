import { apiUrl } from "@/lib/api-client";
import { getSellerToken } from "@/lib/session";

/** Map UI aliases → Backend UploadKind. */
const KIND_ALIASES = {
  product_image: "product",
  product_images: "product",
  image: "product",
  banner: "company_cover",
  cover: "company_cover",
  logo: "company_logo",
};

function resolveKind(kind) {
  const raw = String(kind || "").trim();
  return KIND_ALIASES[raw] || raw;
}

function guessMime(file) {
  if (file?.type) return file.type;
  const name = String(file?.name || "").toLowerCase();
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  if (name.endsWith(".pdf")) return "application/pdf";
  return "";
}

/**
 * Multipart upload to Backend /api/uploads.
 * kind: document | product | company_logo | company_cover | category | industry
 * (aliases like product_image are normalized)
 */
export async function uploadFile({
  kind,
  file,
  productId = "",
  docType = "other",
  alt = "",
  categoryId = "",
} = {}) {
  if (!file) throw new Error("No file selected");
  const resolvedKind = resolveKind(kind);
  if (!resolvedKind) {
    throw new Error("Upload kind is required (product, company_cover, company_logo, document)");
  }

  const form = new FormData();
  form.append("kind", resolvedKind);
  // Some browsers send empty MIME — attach a typed Blob when we can guess.
  const mime = guessMime(file);
  if (mime && !file.type) {
    form.append("file", new File([file], file.name, { type: mime }));
  } else {
    form.append("file", file);
  }
  if (productId) form.append("productId", productId);
  if (docType) form.append("docType", docType);
  if (alt) form.append("alt", alt);
  if (categoryId) form.append("categoryId", categoryId);

  const token = getSellerToken();
  const res = await fetch(apiUrl("/api/uploads"), {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Upload failed (HTTP ${res.status}). Try JPG/PNG under 5MB.`);
  }
  if (!json.success) {
    throw new Error(json.message || `Upload failed (HTTP ${res.status})`);
  }
  return json.data;
}

/** Normalize upload API payload → { url, ... } whether nested under files[] or flat. */
export function firstUploadedFile(data) {
  if (!data || typeof data !== "object") return null;
  if (Array.isArray(data.files) && data.files[0]) return data.files[0];
  if (data.url) return data;
  if (data.file?.url) return data.file;
  return null;
}

export function mediaAbsoluteUrl(pathOrUrl) {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;

  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  const fromEnv = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/$/, "");
  const useLocal = process.env.NEXT_PUBLIC_USE_LOCAL_API === "1";
  const apiBase =
    fromEnv && !/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(fromEnv)
      ? fromEnv
      : useLocal
        ? fromEnv || "http://127.0.0.1:4000"
        : (process.env.NEXT_PUBLIC_HUKUM_API_URL || "https://api.hukum-ksa.com").replace(/\/$/, "");
  const storefront =
    (process.env.NEXT_PUBLIC_STOREFRONT_URL || process.env.NEXT_PUBLIC_MARKETPLACE_URL || "")
      .trim()
      .replace(/\/$/, "") || "https://hukum-ksa.com";

  if (path.startsWith("/api/media") || path.startsWith("/api/")) {
    return `${apiBase}${path}`;
  }

  if (
    path.startsWith("/products/") ||
    path.startsWith("/categories/") ||
    path.startsWith("/industries/") ||
    path.startsWith("/vendors/") ||
    path.startsWith("/brand/")
  ) {
    return `${storefront}${path}`;
  }

  return `${apiBase}${path}`;
}
