import { mediaAbsoluteUrl } from "@/services/uploads-api";
import { localized } from "@/lib/utils";

export function productMediaList(product) {
  const raw = Array.isArray(product?.media) ? product.media : [];
  return [...raw]
    .filter((m) => m?.url)
    .sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return (a.order || 0) - (b.order || 0);
    })
    .map((m) => ({
      ...m,
      url: mediaAbsoluteUrl(m.url),
    }));
}

export function productPrimaryImage(product) {
  return productMediaList(product)[0]?.url || "";
}

export function formatProductPrice(product) {
  const type = product?.priceType || "price_on_request";
  const currency = product?.currency || "SAR";
  const unit = product?.unit ? ` / ${product.unit}` : "";
  if (type === "price_on_request" || type === "contact_supplier" || product?.price == null) {
    return { label: "Price on request", detail: "Request pricing", public: false };
  }
  return {
    label: `${Number(product.price).toLocaleString()} ${currency}${unit}`,
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
