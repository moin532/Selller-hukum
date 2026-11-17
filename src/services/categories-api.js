import { apiGet } from "@/lib/api-client";

export async function fetchCategoryTree() {
  const { json } = await apiGet("/api/categories?resource=tree");
  if (!json.success) throw new Error(json.message || "Failed to load categories");
  return json.data;
}

/** Resolve dynamic form schema for a category key (catalogKey / icon). */
export async function fetchProductForm(categoryKey) {
  if (!categoryKey) throw new Error("categoryKey required");
  const { json } = await apiGet(
    `/api/categories?resource=product-form&categoryKey=${encodeURIComponent(categoryKey)}`
  );
  if (!json.success) throw new Error(json.message || "Failed to load product form");
  return json.data;
}

export function categoryKeyOf(cat) {
  if (!cat) return "";
  return cat.catalogKey || cat.icon || cat.code || cat.slug?.en || "";
}

export function localized(obj, fallback = "") {
  if (!obj) return fallback;
  if (typeof obj === "string") return obj;
  return obj.en || obj.ar || fallback;
}

function apiBase() {
  if (process.env.NEXT_PUBLIC_USE_LOCAL_API === "1") {
    return (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000").replace(/\/$/, "");
  }
  const fromEnv = (process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_HUKUM_API_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (fromEnv && !/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(fromEnv)) {
    return fromEnv;
  }
  return "https://api.hukum-ksa.com";
}

/** Marketplace origin for static /categories/*.jpg (seller panel does not host those assets). */
function marketplaceOrigin() {
  const fromEnv = (process.env.NEXT_PUBLIC_MARKETPLACE_URL || process.env.NEXT_PUBLIC_APP_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") {
    const host = window.location.hostname || "";
    if (host.endsWith("hukum-ksa.com")) return "https://hukum-ksa.com";
  }
  return "https://hukum-ksa.com";
}

/** Public category image — Mongo upload URL or marketplace /categories/{key}.jpg. */
export function categoryImageSrc(cat) {
  const key = categoryKeyOf(cat);
  const api = apiBase();
  const market = marketplaceOrigin();
  if (cat?.image && String(cat.image).startsWith("http")) return cat.image;
  if (cat?.image && String(cat.image).startsWith("/api/media")) return `${api}${cat.image}`;
  // Static category art lives on the marketplace host, not seller.hukum-ksa.com.
  if (cat?.image && String(cat.image).startsWith("/categories/")) return `${market}${cat.image}`;
  if (cat?.image && String(cat.image).startsWith("/images/categories/")) return `${market}${cat.image}`;
  if (cat?.image && String(cat.image).startsWith("/")) return `${api}${cat.image}`;
  if (key) return `${market}/categories/${key}.jpg`;
  return null;
}

/** Normalize Mongo id whether raw string or populated `{ _id }`. */
export function idOf(value) {
  if (value == null || value === "") return "";
  if (typeof value === "object") return String(value._id || value.id || "");
  return String(value);
}
