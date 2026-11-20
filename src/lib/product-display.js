import { mediaAbsoluteUrl } from "@/services/uploads-api";
import { localized } from "@/lib/utils";

function mediaUrl(raw) {
  if (!raw) return "";
  if (typeof raw === "string") return mediaAbsoluteUrl(raw);
  if (typeof raw === "object") {
    const nested = raw.url || raw.src || raw.path || "";
    return nested ? mediaAbsoluteUrl(String(nested)) : "";
  }
  return mediaAbsoluteUrl(String(raw));
}

export function productMediaList(product) {
  const raw = Array.isArray(product?.media) ? product.media : [];
  const withIndex = raw
    .map((m, index) => ({ m, index }))
    .filter(({ m }) => Boolean(mediaUrl(m?.url) || mediaUrl(m)));

  const hasPrimary = withIndex.some(({ m }) => m.isPrimary);
  withIndex.sort((a, b) => {
    if (hasPrimary) {
      if (a.m.isPrimary && !b.m.isPrimary) return -1;
      if (!a.m.isPrimary && b.m.isPrimary) return 1;
    }
    const ao = Number.isFinite(Number(a.m.order)) ? Number(a.m.order) : a.index;
    const bo = Number.isFinite(Number(b.m.order)) ? Number(b.m.order) : b.index;
    // Prefer small human orders (0,1,2…) over upload timestamps
    const aBig = ao > 1_000_000_000;
    const bBig = bo > 1_000_000_000;
    if (aBig !== bBig) return aBig ? 1 : -1;
    if (ao !== bo) return ao - bo;
    return a.index - b.index;
  });

  return withIndex.map(({ m }) => ({
    ...m,
    url: mediaUrl(m.url) || mediaUrl(m),
  }));
}

export function productPrimaryImage(product) {
  return productMediaList(product)[0]?.url || "";
}

export function formatProductPrice(product) {
  const type = product?.priceType || "price_on_request";
  const currency = product?.currency || "SAR";
  const unit = product?.unit ? ` / ${product.unit}` : "";
  const numeric = product?.price == null || product?.price === "" ? NaN : Number(product.price);
  const hasPrice = Number.isFinite(numeric) && numeric >= 0;

  // Show a real price whenever one is stored, even if type was left as price_on_request.
  if (hasPrice && type !== "contact_supplier") {
    if (type === "price_on_request" && numeric === 0) {
      return { label: "Price on request", detail: "Request pricing", public: false };
    }
    return {
      label: `${numeric.toLocaleString()} ${currency}${unit}`,
      detail: String(type || "fixed").replace(/_/g, " "),
      public: true,
    };
  }

  if (type === "price_on_request" || type === "contact_supplier" || !hasPrice) {
    return { label: "Price on request", detail: "Request pricing", public: false };
  }
  return {
    label: `${numeric.toLocaleString()} ${currency}${unit}`,
    detail: String(type).replace(/_/g, " "),
    public: true,
  };
}

export function productTitle(product) {
  return localized(product?.name, localized(product?.title, "Untitled product"));
}

export function productTitleSecondary(product) {
  const en = product?.name?.en || "";
  const ar = product?.name?.ar || "";
  const primary = productTitle(product);
  if (ar && ar !== primary) return ar;
  if (en && en !== primary) return en;
  return "";
}

export function publicProductUrl(product) {
  const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000").replace(/\/$/, "");
  const slug = product?.slug?.en || product?.slug?.ar || product?._id;
  if (!slug) return "";
  return `${base}/en/products/${slug}`;
}
