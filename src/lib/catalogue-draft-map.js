/** Map AI catalogue draft preview → ProductDetailView product shape. */

export function catalogueDraftToProduct(draft, { extractionId, index } = {}) {
  if (!draft || typeof draft !== "object") return null;
  const nameEn = draft.nameEn || draft.name || draft.title || "Untitled product";
  const nameAr = draft.nameAr || nameEn;
  const media = Array.isArray(draft.media) && draft.media.length
    ? draft.media.map((m, i) => ({
        url: m.url,
        type: m.type || "image",
        isPrimary: Boolean(m.isPrimary) || i === 0,
        order: m.order ?? i,
        alt: m.alt || { en: nameEn, ar: nameAr },
      }))
    : draft.imageUrl
      ? [{ url: draft.imageUrl, type: "image", isPrimary: true, order: 0, alt: { en: nameEn, ar: nameAr } }]
      : [];

  return {
    _id: extractionId ? `preview-${extractionId}-${index ?? 0}` : undefined,
    status: "draft",
    sku: draft.sku || "",
    brand: draft.brand || "",
    name: { en: nameEn, ar: nameAr },
    title: { en: nameEn, ar: nameAr },
    shortDescription: draft.shortDescription || { en: "", ar: "" },
    description: draft.description || { en: "", ar: "" },
    applications: draft.applications || { en: "", ar: "" },
    price: draft.price ?? null,
    retailPrice: draft.retailPrice ?? null,
    currency: draft.currency || "SAR",
    priceType: draft.price != null ? "fixed" : "price_on_request",
    unit: draft.unit || "piece",
    moq: draft.moq ?? null,
    media,
    seo: draft.seo || {},
    tags: draft.tags || ["ai-catalogue"],
    customSpecifications: [
      ...(draft.categoryHint ? [{ key: "categoryHint", value: draft.categoryHint }] : []),
      ...Object.entries(draft.specs || {}).map(([key, value]) => ({ key, value: String(value) })),
      draft.source ? { key: "aiSource", value: String(draft.source) } : null,
      draft.confidence != null ? { key: "aiConfidence", value: String(draft.confidence) } : null,
    ].filter(Boolean),
  };
}
