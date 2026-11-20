"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SellerShell } from "@/components/layout/SellerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  DynamicAttributeFields,
  validateMandatoryAttributes,
} from "@/components/products/DynamicAttributeFields";
import { KeyValueEditor } from "@/components/products/KeyValueEditor";
import { VariantEditor } from "@/components/products/VariantEditor";
import {
  categoryKeyOf,
  fetchCategoryTree,
  fetchProductForm,
  idOf,
  localized,
} from "@/services/categories-api";
import Link from "next/link";
import { createProduct, fetchProduct, updateProduct, submitProduct } from "@/services/products-api";
import { fetchMyVendor } from "@/services/company-api";
import { ProductImagesUploader } from "@/components/products/ProductImagesUploader";
import { isVendorVerified, vendorLockMessage } from "@/lib/vendor-access";

const STEPS = [
  { id: "category", label: "Category", labelAr: "التصنيف", blurb: "Where buyers will find this product" },
  { id: "info", label: "Information", labelAr: "المعلومات", blurb: "Name, brand, and product identity" },
  { id: "description", label: "Description", labelAr: "الوصف", blurb: "Tell buyers what you offer" },
  { id: "specs", label: "Specifications", labelAr: "المواصفات", blurb: "Technical and commercial details" },
  { id: "variants", label: "Variants", labelAr: "المتغيرات", blurb: "Optional sizes, colors, SKUs" },
  { id: "pricing", label: "Pricing", labelAr: "التسعير", blurb: "MOQ, currency, and availability" },
  { id: "media", label: "Images", labelAr: "الصور", blurb: "Up to 7 product photos" },
  { id: "seo", label: "SEO", labelAr: "تحسين الظهور", blurb: "How this appears in search" },
  { id: "submit", label: "Submit", labelAr: "إرسال", blurb: "Review and send for approval" },
];

const CURRENCIES = ["SAR", "USD", "EUR", "AED"];
const UNITS = ["piece", "box", "kg", "ton", "meter", "set", "pair", "liter", "roll", "pack"];
const CONDITIONS = ["new", "refurbished", "used", "made_to_order", "sample"];
const DRAFT_STORAGE_KEY = "kt_seller_product_wizard_v1";

function readDraftCache() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function writeDraftCache(payload) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ ...payload, savedAt: Date.now() }));
  } catch {
    /* ignore quota */
  }
}

function clearDraftCache() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function mediaUrlsFromProduct(p) {
  const media = Array.isArray(p?.media) ? [...p.media] : [];
  media.sort((a, b) => {
    if (a?.isPrimary && !b?.isPrimary) return -1;
    if (!a?.isPrimary && b?.isPrimary) return 1;
    return (a?.order || 0) - (b?.order || 0);
  });
  return media.map((m) => m?.url).filter(Boolean).slice(0, 7);
}

function autoMetaTitle(name, brand, categoryName) {
  const parts = [name, brand, categoryName, "Saudi Arabia"].filter(Boolean);
  return parts.join(" | ").slice(0, 70);
}

function autoMetaDescription(shortDesc, desc, name) {
  const raw = shortDesc || desc || `Buy ${name || "this product"} on Hukum B2B marketplace.`;
  return String(raw).replace(/\s+/g, " ").trim().slice(0, 160);
}

function Field({ label, required, hint, className = "", children }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 ${className}`.trim()}>
      <span className="text-[0.72rem] font-semibold tracking-wide text-text">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="text-[0.7rem] text-muted">{hint}</span> : null}
    </label>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="mb-3 mt-0 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[#8a6a2f]">{children}</p>
  );
}

export default function NewProductWizardPage() {
  const router = useRouter();
  const [vendor, setVendor] = useState(null);
  const [vendorLoading, setVendorLoading] = useState(true);
  const [draftLoading, setDraftLoading] = useState(true);
  const hydratedRef = useRef(false);
  const [step, setStep] = useState(0);
  const [tree, setTree] = useState({ industries: [], categories: [] });
  const [industryId, setIndustryId] = useState("");
  const [mainCategoryId, setMainCategoryId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [industrySearch, setIndustrySearch] = useState("");
  const [typeSearch, setTypeSearch] = useState("");
  const [formSchema, setFormSchema] = useState(null);
  const [schemaLoading, setSchemaLoading] = useState(false);

  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [descEn, setDescEn] = useState("");
  const [applications, setApplications] = useState("");
  const [brand, setBrand] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [sku, setSku] = useState("");
  const [model, setModel] = useState("");
  const [condition, setCondition] = useState("new");
  const [tags, setTags] = useState("");
  const [country, setCountry] = useState("SA");
  const [hsCode, setHsCode] = useState("");

  const [attributes, setAttributes] = useState({});
  const [attrErrors, setAttrErrors] = useState({});
  const [customSpecs, setCustomSpecs] = useState([{ key: "", value: "" }]);
  const [variants, setVariants] = useState([]);

  const [priceOnRequest, setPriceOnRequest] = useState(true);
  const [unitPrice, setUnitPrice] = useState("");
  const [currency, setCurrency] = useState("SAR");
  const [unit, setUnit] = useState("piece");
  const [moq, setMoq] = useState("");
  const [maxOrderQty, setMaxOrderQty] = useState("");
  const [leadTime, setLeadTime] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [sampleAvailable, setSampleAvailable] = useState(false);
  const [availability, setAvailability] = useState("in_stock");

  /** Up to 7 product image URLs — index 0 is primary. */
  const [productImages, setProductImages] = useState([]);

  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaKeywords, setMetaKeywords] = useState("");
  const [metaAuto, setMetaAuto] = useState(true);

  const [draftId, setDraftId] = useState("");
  const [saveState, setSaveState] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchMyVendor()
      .then(setVendor)
      .catch(() => setVendor(null))
      .finally(() => setVendorLoading(false));
  }, []);

  useEffect(() => {
    if (vendorLoading) return;
    if (!isVendorVerified(vendor)) {
      setDraftLoading(false);
      return;
    }
    fetchCategoryTree()
      .then((data) => {
        // Prefer Hukum developer taxonomy industries (H001…).
        const industries = (data.industries || []).slice().sort((a, b) => {
          const ac = String(a.code || "");
          const bc = String(b.code || "");
          const aH = /^H\d+/i.test(ac);
          const bH = /^H\d+/i.test(bc);
          if (aH !== bH) return aH ? -1 : 1;
          return (a.order || 0) - (b.order || 0) || localized(a.name).localeCompare(localized(b.name));
        });
        setTree({ industries, categories: data.categories || [] });
      })
      .catch((e) => setError(e.message || "Failed to load categories"));
  }, [vendor, vendorLoading]);

  const applyCategoryContext = useCallback(
    (cid, categories) => {
      const cat = (categories || []).find((c) => idOf(c._id) === String(cid));
      if (!cat) return;
      setIndustryId(idOf(cat.industryId));
      const parent = idOf(cat.parentId);
      if (parent) {
        setMainCategoryId(parent);
        setCategoryId(idOf(cat._id));
      } else {
        setMainCategoryId(idOf(cat._id));
        setCategoryId(idOf(cat._id));
      }
      const key = categoryKeyOf(cat);
      if (key) {
        setSchemaLoading(true);
        fetchProductForm(key)
          .then(setFormSchema)
          .catch(() => setFormSchema(null))
          .finally(() => setSchemaLoading(false));
      }
    },
    []
  );

  const hydrateFromProduct = useCallback(
    (p, categories = []) => {
      if (!p) return;
      setDraftId(String(p._id || p.id || ""));
      setNameEn(p.name?.en || "");
      setNameAr(p.name?.ar || "");
      setShortDesc(p.shortDescription?.en || "");
      setDescEn(p.description?.en || "");
      setApplications(p.applications?.en || "");
      setSku(p.sku || "");
      setManufacturer(p.manufacturer || p.manufacturerName || "");
      setModel(p.modelNumber || p.model || "");
      setCondition(p.condition || "new");
      setTags((p.tags || p.searchTags || []).join(", "));
      setCountry(p.countryOfOrigin || p.origin?.countryOfOrigin || "SA");
      setHsCode(p.hsCode || "");
      const attrs =
        p.attributes instanceof Map
          ? Object.fromEntries(p.attributes)
          : p.attributes && typeof p.attributes === "object"
            ? { ...p.attributes }
            : {};
      setAttributes(attrs);
      setBrand(p.brand || attrs.brand || "");
      const cid = idOf(p.categoryId);
      if (cid) applyCategoryContext(cid, categories);
      const specs =
        Array.isArray(p.customSpecifications) && p.customSpecifications.length
          ? p.customSpecifications.map((r) => ({ key: r.key || "", value: r.value || "" }))
          : [{ key: "", value: "" }];
      setCustomSpecs(specs);
      setVariants(Array.isArray(p.variants) ? p.variants : []);
      const onRequest = !p.price || p.priceType === "price_on_request" || p.priceType === "contact_supplier";
      setPriceOnRequest(onRequest);
      setUnitPrice(p.price != null ? String(p.price) : "");
      setCurrency(p.currency || "SAR");
      setUnit(p.unit || "piece");
      setMoq(p.moq != null ? String(p.moq) : "");
      setMaxOrderQty(p.maxOrderQty != null ? String(p.maxOrderQty) : "");
      setLeadTime(p.leadTime || "");
      setPaymentTerms(p.paymentTerms || "");
      setSampleAvailable(Boolean(p.sampleAvailable));
      setAvailability(p.availability || "in_stock");
      setProductImages(mediaUrlsFromProduct(p));
      setMetaTitle(p.seo?.title?.en || "");
      setMetaDescription(p.seo?.description?.en || "");
      setMetaKeywords(p.seo?.keywords?.en || "");
      setMetaAuto(false);
      setSaveState("saved");
      setMessage("Draft restored — continue where you left off.");
    },
    [applyCategoryContext]
  );

  const hydrateFromCache = useCallback((cache) => {
    if (!cache) return;
    if (typeof cache.step === "number") setStep(Math.min(Math.max(0, cache.step), STEPS.length - 1));
    if (cache.draftId) setDraftId(String(cache.draftId));
    if (cache.industryId) setIndustryId(String(cache.industryId));
    if (cache.mainCategoryId) setMainCategoryId(String(cache.mainCategoryId));
    if (cache.categoryId) setCategoryId(String(cache.categoryId));
    if (cache.nameEn != null) setNameEn(cache.nameEn);
    if (cache.nameAr != null) setNameAr(cache.nameAr);
    if (cache.shortDesc != null) setShortDesc(cache.shortDesc);
    if (cache.descEn != null) setDescEn(cache.descEn);
    if (cache.applications != null) setApplications(cache.applications);
    if (cache.brand != null) setBrand(cache.brand);
    if (cache.manufacturer != null) setManufacturer(cache.manufacturer);
    if (cache.sku != null) setSku(cache.sku);
    if (cache.model != null) setModel(cache.model);
    if (cache.condition != null) setCondition(cache.condition);
    if (cache.tags != null) setTags(cache.tags);
    if (cache.country != null) setCountry(cache.country);
    if (cache.hsCode != null) setHsCode(cache.hsCode);
    if (cache.attributes && typeof cache.attributes === "object") setAttributes(cache.attributes);
    if (Array.isArray(cache.customSpecs)) setCustomSpecs(cache.customSpecs);
    if (Array.isArray(cache.variants)) setVariants(cache.variants);
    if (typeof cache.priceOnRequest === "boolean") setPriceOnRequest(cache.priceOnRequest);
    if (cache.unitPrice != null) setUnitPrice(cache.unitPrice);
    if (cache.currency != null) setCurrency(cache.currency);
    if (cache.unit != null) setUnit(cache.unit);
    if (cache.moq != null) setMoq(cache.moq);
    if (cache.maxOrderQty != null) setMaxOrderQty(cache.maxOrderQty);
    if (cache.leadTime != null) setLeadTime(cache.leadTime);
    if (cache.paymentTerms != null) setPaymentTerms(cache.paymentTerms);
    if (typeof cache.sampleAvailable === "boolean") setSampleAvailable(cache.sampleAvailable);
    if (cache.availability != null) setAvailability(cache.availability);
    if (Array.isArray(cache.productImages)) setProductImages(cache.productImages.slice(0, 7));
    if (cache.metaTitle != null) setMetaTitle(cache.metaTitle);
    if (cache.metaDescription != null) setMetaDescription(cache.metaDescription);
    if (cache.metaKeywords != null) setMetaKeywords(cache.metaKeywords);
    if (typeof cache.metaAuto === "boolean") setMetaAuto(cache.metaAuto);
  }, []);

  // Restore draft after refresh: URL ?draft=… → API, else local cache.
  useEffect(() => {
    if (vendorLoading || !isVendorVerified(vendor) || hydratedRef.current) return;
    let alive = true;
    (async () => {
      setDraftLoading(true);
      const urlDraft =
        typeof window !== "undefined"
          ? String(new URLSearchParams(window.location.search).get("draft") || "").trim()
          : "";
      const cache = readDraftCache();
      const draftKey = urlDraft || String(cache?.draftId || "").trim();
      try {
        let categories = tree.categories;
        if (!categories.length) {
          const data = await fetchCategoryTree();
          if (!alive) return;
          categories = data.categories || [];
          setTree({ industries: data.industries || [], categories });
        }
        if (draftKey) {
          try {
            const p = await fetchProduct(draftKey);
            if (!alive) return;
            hydrateFromProduct(p, categories);
            if (cache?.step != null) setStep(Math.min(Math.max(0, Number(cache.step) || 0), STEPS.length - 1));
            router.replace(`/dashboard/products/new?draft=${encodeURIComponent(draftKey)}`);
          } catch {
            if (cache) hydrateFromCache(cache);
          }
        } else if (cache) {
          hydrateFromCache(cache);
          if (cache.categoryId) applyCategoryContext(cache.categoryId, categories);
        }
      } catch (e) {
        if (alive) setError(e.message || "Could not restore draft");
      } finally {
        if (alive) {
          hydratedRef.current = true;
          setDraftLoading(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
    // Intentionally once after vendor is ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendor, vendorLoading]);

  const selectedCategory = useMemo(
    () => tree.categories.find((c) => String(c._id) === categoryId) || null,
    [tree.categories, categoryId]
  );

  const mainCategories = useMemo(() => {
    let list = tree.categories.filter(
      (c) =>
        idOf(c.industryId) === industryId &&
        (c.status || "active") === "active" &&
        (c.level || 1) === 1 &&
        !idOf(c.parentId)
    );
    if (categorySearch.trim()) {
      const q = categorySearch.trim().toLowerCase();
      list = list.filter((c) => localized(c.name).toLowerCase().includes(q));
    }
    return list.sort((a, b) => (a.order || 0) - (b.order || 0) || localized(a.name).localeCompare(localized(b.name)));
  }, [tree.categories, industryId, categorySearch]);

  const subcategories = useMemo(() => {
    if (!mainCategoryId) return [];
    let list = tree.categories.filter(
      (c) =>
        idOf(c.parentId) === mainCategoryId &&
        (c.status || "active") === "active" &&
        (c.level || 2) >= 2
    );
    if (typeSearch.trim()) {
      const q = typeSearch.trim().toLowerCase();
      list = list.filter((c) => {
        const en = localized(c.name).toLowerCase();
        const ar = String(c.name?.ar || "").toLowerCase();
        return en.includes(q) || ar.includes(q);
      });
    }
    return list.sort((a, b) => (a.order || 0) - (b.order || 0) || localized(a.name).localeCompare(localized(b.name)));
  }, [tree.categories, mainCategoryId, typeSearch]);

  const loadSchema = useCallback(async (cat) => {
    const key = categoryKeyOf(cat);
    if (!key) {
      setFormSchema(null);
      return;
    }
    setSchemaLoading(true);
    try {
      setFormSchema(await fetchProductForm(key));
    } catch (e) {
      setFormSchema(null);
      setError(e.message || "Could not load category attributes");
    } finally {
      setSchemaLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!metaAuto) return;
    setMetaTitle(autoMetaTitle(nameEn, brand, localized(selectedCategory?.name)));
    setMetaDescription(autoMetaDescription(shortDesc, descEn, nameEn));
  }, [metaAuto, nameEn, brand, shortDesc, descEn, selectedCategory]);

  // Keep a local backup so refresh never wipes in-progress work.
  useEffect(() => {
    if (!hydratedRef.current || draftLoading) return;
    const timer = setTimeout(() => {
      writeDraftCache({
        draftId,
        step,
        industryId,
        mainCategoryId,
        categoryId,
        nameEn,
        nameAr,
        shortDesc,
        descEn,
        applications,
        brand,
        manufacturer,
        sku,
        model,
        condition,
        tags,
        country,
        hsCode,
        attributes,
        customSpecs,
        variants,
        priceOnRequest,
        unitPrice,
        currency,
        unit,
        moq,
        maxOrderQty,
        leadTime,
        paymentTerms,
        sampleAvailable,
        availability,
        productImages,
        metaTitle,
        metaDescription,
        metaKeywords,
        metaAuto,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [
    draftLoading,
    draftId,
    step,
    industryId,
    mainCategoryId,
    categoryId,
    nameEn,
    nameAr,
    shortDesc,
    descEn,
    applications,
    brand,
    manufacturer,
    sku,
    model,
    condition,
    tags,
    country,
    hsCode,
    attributes,
    customSpecs,
    variants,
    priceOnRequest,
    unitPrice,
    currency,
    unit,
    moq,
    maxOrderQty,
    leadTime,
    paymentTerms,
    sampleAvailable,
    availability,
    productImages,
    metaTitle,
    metaDescription,
    metaKeywords,
    metaAuto,
  ]);

  const selectedIndustry = useMemo(
    () => tree.industries.find((i) => idOf(i._id) === industryId) || null,
    [tree.industries, industryId]
  );

  const selectedMainCategory = useMemo(
    () => tree.categories.find((c) => idOf(c._id) === mainCategoryId) || null,
    [tree.categories, mainCategoryId]
  );

  const visibleIndustries = useMemo(() => {
    let list = tree.industries.filter((i) => (i.status || "active") === "active");
    if (industrySearch.trim()) {
      const q = industrySearch.trim().toLowerCase();
      list = list.filter((i) => {
        const en = localized(i.name).toLowerCase();
        const ar = String(i.name?.ar || "").toLowerCase();
        const code = String(i.code || "").toLowerCase();
        return en.includes(q) || ar.includes(q) || code.includes(q);
      });
    }
    return list;
  }, [tree.industries, industrySearch]);

  const showSubcategoryPanel = Boolean(mainCategoryId && subcategories.length > 0);

  async function onSelectMainCategory(cat) {
    if (categoryId && Object.keys(attributes).length) {
      if (!window.confirm("Changing category may drop some attributes. Continue?")) return;
    }
    const id = idOf(cat._id);
    setError("");
    setMessage("");
    setMainCategoryId(id);
    setCategoryId("");
    setFormSchema(null);
    setAttributes({});
    setTypeSearch("");
    const kids = tree.categories.filter(
      (c) => idOf(c.parentId) === id && (c.status || "active") === "active"
    );
    if (kids.length === 0) {
      setCategoryId(id);
      await loadSchema(cat);
    }
  }

  function clearMainCategory() {
    setMainCategoryId("");
    setCategoryId("");
    setFormSchema(null);
    setAttributes({});
    setCategorySearch("");
    setTypeSearch("");
    setError("");
    setMessage("");
  }

  function clearIndustry() {
    setIndustryId("");
    setIndustrySearch("");
    clearMainCategory();
  }

  async function onSelectCategory(cat) {
    if (categoryId && categoryId !== idOf(cat._id) && Object.keys(attributes).length) {
      if (!window.confirm("Changing category may drop some attributes. Continue?")) return;
    }
    setError("");
    setMessage("");
    setCategoryId(idOf(cat._id));
    await loadSchema(cat);
  }

  /** Identity fields already collected in Information — don't ask again in specs. */
  const IDENTITY_ATTR_KEYS = useMemo(() => new Set(["brand", "model", "country_of_origin"]), []);

  const specAttributes = useMemo(() => {
    const attrs = formSchema?.attributes || [];
    return attrs.filter(
      (a) =>
        ["general", "technical", "physical", "performance", "commercial"].includes(a.group) &&
        !IDENTITY_ATTR_KEYS.has(a.key)
    );
  }, [formSchema, IDENTITY_ATTR_KEYS]);

  function buildPayload(status = "draft") {
    const media = (productImages || [])
      .map((u) => String(u || "").trim())
      .filter(Boolean)
      .slice(0, 7)
      .map((url, i) => ({
        url,
        type: "image",
        isPrimary: i === 0,
        order: i,
        alt: { en: nameEn, ar: nameAr || "" },
      }));

    const cleanSpecs = (customSpecs || [])
      .filter((r) => String(r.key || "").trim() && String(r.value || "").trim())
      .map((r) => ({ key: String(r.key).trim(), value: String(r.value).trim() }));

    const cleanVariants = (variants || [])
      .filter((v) => v.color || v.size || v.name || v.sku)
      .map((v) => ({
        name: v.name || [v.color, v.size].filter(Boolean).join(" / "),
        color: v.color || "",
        size: v.size || "",
        sku: v.sku || "",
        price: v.price === "" || v.price == null ? undefined : Number(v.price),
        stock: v.stock === "" || v.stock == null ? undefined : Number(v.stock),
        image: v.image || "",
        status: "active",
      }));

    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    return {
      name: { en: nameEn.trim(), ar: nameAr.trim() },
      title: { en: nameEn.trim(), ar: nameAr.trim() },
      description: { en: descEn, ar: "" },
      shortDescription: shortDesc ? { en: shortDesc, ar: "" } : undefined,
      applications: applications ? { en: applications, ar: "" } : undefined,
      brand: brand || undefined,
      manufacturer: manufacturer || undefined,
      sku: sku || undefined,
      modelNumber: model || undefined,
      model: model || undefined,
      condition,
      tags: tagList,
      searchTags: tagList,
      industryId: industryId || undefined,
      categoryId: categoryId || undefined,
      attributes: {
        ...attributes,
        brand: brand || attributes.brand || "",
        model: model || attributes.model || "",
        country_of_origin: attributes.country_of_origin || country,
      },
      customSpecifications: cleanSpecs,
      variants: cleanVariants,
      priceType: priceOnRequest ? "price_on_request" : "fixed",
      price: priceOnRequest ? undefined : Number(unitPrice) || undefined,
      currency,
      unit,
      moq: moq === "" ? undefined : Number(moq),
      // Send null (not undefined) so PATCH clears a previously saved invalid max.
      maxOrderQty: (() => {
        if (maxOrderQty === "") return null;
        const max = Number(maxOrderQty);
        const min = moq === "" ? NaN : Number(moq);
        if (!Number.isNaN(min) && !Number.isNaN(max) && max > 0 && max < min) return null;
        return Number.isNaN(max) ? null : max;
      })(),
      leadTime: leadTime || undefined,
      paymentTerms: paymentTerms || undefined,
      sampleAvailable,
      availability,
      media: media.length ? media : undefined,
      status,
      countryOfOrigin: country,
      hsCode: hsCode || undefined,
      origin: { countryOfOrigin: country },
      seo: {
        title: { en: metaTitle || autoMetaTitle(nameEn, brand, localized(selectedCategory?.name)), ar: "" },
        description: {
          en: metaDescription || autoMetaDescription(shortDesc, descEn, nameEn),
          ar: "",
        },
        keywords: { en: metaKeywords || tagList.join(", "), ar: "" },
        h1: { en: nameEn.trim(), ar: nameAr.trim() },
        indexable: true,
      },
    };
  }

  async function saveDraft() {
    if (!nameEn.trim()) {
      setError("Product name (EN) is required to save a draft");
      return null;
    }
    setSaveState("saving");
    setError("");
    try {
      const payload = buildPayload("draft");
      let id = draftId;
      if (id) {
        await updateProduct(id, payload);
      } else {
        const data = await createProduct(payload);
        id = String(data?.product?._id || data?._id || "");
        setDraftId(id);
      }
      if (id) {
        writeDraftCache({
          draftId: id,
          step,
          industryId,
          mainCategoryId,
          categoryId,
          nameEn,
          nameAr,
          shortDesc,
          descEn,
          applications,
          brand,
          manufacturer,
          sku,
          model,
          condition,
          tags,
          country,
          hsCode,
          attributes,
          customSpecs,
          variants,
          priceOnRequest,
          unitPrice,
          currency,
          unit,
          moq,
          maxOrderQty,
          leadTime,
          paymentTerms,
          sampleAvailable,
          availability,
          productImages,
          metaTitle,
          metaDescription,
          metaKeywords,
          metaAuto,
        });
        router.replace(`/dashboard/products/new?draft=${encodeURIComponent(id)}`);
      }
      setSaveState("saved");
      setMessage("Draft saved. You can refresh — your data will stay.");
      return id;
    } catch (e) {
      setSaveState("error");
      setError(e.message || "Save failed");
      return null;
    }
  }

  function startNewProduct() {
    if (
      (nameEn || productImages.length || draftId) &&
      !window.confirm("Start a new product? Current form data on this page will be cleared.")
    ) {
      return;
    }
    clearDraftCache();
    hydratedRef.current = true;
    setDraftId("");
    setStep(0);
    setMainCategoryId("");
    setCategoryId("");
    setFormSchema(null);
    setNameEn("");
    setNameAr("");
    setShortDesc("");
    setDescEn("");
    setApplications("");
    setBrand("");
    setManufacturer("");
    setSku("");
    setModel("");
    setCondition("new");
    setTags("");
    setCountry("SA");
    setHsCode("");
    setAttributes({});
    setCustomSpecs([{ key: "", value: "" }]);
    setVariants([]);
    setPriceOnRequest(true);
    setUnitPrice("");
    setCurrency("SAR");
    setUnit("piece");
    setMoq("");
    setMaxOrderQty("");
    setLeadTime("");
    setPaymentTerms("");
    setSampleAvailable(false);
    setAvailability("in_stock");
    setProductImages([]);
    setMetaTitle("");
    setMetaDescription("");
    setMetaKeywords("");
    setMetaAuto(true);
    setSaveState("");
    setError("");
    setMessage("New product form ready.");
    router.replace("/dashboard/products/new");
  }

  function validateStep() {
    setError("");
    setAttrErrors({});
    if (step === 0 && !categoryId) {
      setError(
        subcategories.length
          ? "Select a subcategory under the main category"
          : "Select an active main category"
      );
      return false;
    }
    if (step === 1 && !nameEn.trim()) {
      setError("English product name is required");
      return false;
    }
    if (step === 3) {
      const errs = validateMandatoryAttributes(specAttributes, attributes);
      if (Object.keys(errs).length) {
        setAttrErrors(errs);
        setError("Complete required category specification fields");
        return false;
      }
    }
    if (step === 5) {
      if (!priceOnRequest) {
        if (unitPrice === "" || Number.isNaN(Number(unitPrice))) {
          setError("Enter a unit price or enable price on request");
          return false;
        }
        if (Number(unitPrice) < 0) {
          setError("Unit price must be 0 or greater");
          return false;
        }
      }
      if (moq !== "" && Number(moq) < 0) {
        setError("MOQ must be 0 or greater");
        return false;
      }
      // Max qty is optional. If it is below MOQ (common paste mistake), clear it and continue.
      if (
        moq !== "" &&
        maxOrderQty !== "" &&
        !Number.isNaN(Number(moq)) &&
        !Number.isNaN(Number(maxOrderQty)) &&
        Number(maxOrderQty) > 0 &&
        Number(maxOrderQty) < Number(moq)
      ) {
        setMaxOrderQty("");
      }
    }
    if (step === 6 && !(productImages || []).some((u) => String(u || "").trim())) {
      setError("Add at least one product image before continuing");
      return false;
    }
    return true;
  }

  async function next() {
    // Sanitize pricing before validate/save so stale maxOrderQty never blocks the API.
    if (
      step === 5 &&
      moq !== "" &&
      maxOrderQty !== "" &&
      Number(maxOrderQty) > 0 &&
      Number(maxOrderQty) < Number(moq)
    ) {
      setMaxOrderQty("");
      setError("");
    }
    if (!validateStep()) return;
    if ([1, 2, 3, 4, 5, 6, 7].includes(step)) await saveDraft();
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function onSubmitForReview() {
    if (busy) return;
    if (!validateStep()) return;
    const errs = validateMandatoryAttributes(specAttributes, attributes);
    if (Object.keys(errs).length) {
      setAttrErrors(errs);
      setError("Required specifications missing");
      setStep(3);
      return;
    }
    if (!nameEn.trim() || !categoryId) {
      setError("Name and category are required");
      return;
    }
    if (!(productImages || []).some((u) => String(u || "").trim())) {
      setError("Upload at least one product image before submitting");
      setStep(6);
      return;
    }
    if (!priceOnRequest && Number(unitPrice) < 0) {
      setError("Unit price must be 0 or greater");
      setStep(5);
      return;
    }
    if (
      moq !== "" &&
      maxOrderQty !== "" &&
      Number(maxOrderQty) > 0 &&
      Number(maxOrderQty) < Number(moq)
    ) {
      setMaxOrderQty("");
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      let id = draftId;
      if (!id) {
        id = await saveDraft();
      }
      if (!id) throw new Error("Could not save draft before submit");

      // One PATCH: full product data + submitted status (notifies admin panel).
      await submitProduct(id, buildPayload("submitted"));
      clearDraftCache();
      setDraftId("");
      setSaveState("saved");
      setMessage("Success — product submitted for Super Admin approval.");
      // Let the seller see the success message, then open their products list.
      setTimeout(() => {
        router.replace("/dashboard/products?status=submitted");
      }, 1200);
    } catch (e) {
      setError(e.message || "Submit failed");
      setBusy(false);
    }
  }

  if (vendorLoading || draftLoading) {
    return (
      <SellerShell title="Add product">
        <p className="text-muted">
          {vendorLoading ? "Checking company verification…" : "Restoring your draft…"}
        </p>
      </SellerShell>
    );
  }

  if (!isVendorVerified(vendor)) {
    return (
      <SellerShell title="Add product">
        <PageHeader title="Add product" subtitle="Locked until company verification." />
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="m-0 text-sm text-gold">{vendorLockMessage(vendor)}</p>
          {vendor?.verificationRejectionReason ? (
            <p className="mt-3 mb-0 text-sm text-danger">{vendor.verificationRejectionReason}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/dashboard/verification" className="btn-primary">
              Verification center
            </Link>
            <Link href="/dashboard/products" className="btn-outline">
              Back to products
            </Link>
          </div>
        </div>
      </SellerShell>
    );
  }

  const stepMeta = STEPS[step];
  const progressPct = Math.round(((step + (categoryId || step > 0 ? 1 : 0)) / STEPS.length) * 100);
  const footerHint =
    step === 0 && !categoryId
      ? !industryId
        ? "Choose industry first"
        : !mainCategoryId
          ? "Then choose category"
          : "Then choose product type"
      : selectedCategory
        ? localized(selectedCategory.name)
        : null;

  return (
    <SellerShell title="Add product">
      <div className="relative pb-28">
        {/* Premium brand stage */}
        <section className="relative mb-5 overflow-hidden rounded-2xl border border-[#1a4a38]/25 bg-gradient-to-br from-[#0b3d2e] via-[#145c44] to-[#17634b] text-white shadow-[0_12px_40px_rgba(11,61,46,0.22)]">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.14]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30z' fill='none' stroke='%23c9a227' stroke-width='0.6'/%3E%3C/svg%3E\")",
            }}
            aria-hidden
          />
          <div className="relative flex flex-wrap items-end justify-between gap-4 px-5 py-6 md:px-7 md:py-7">
            <div className="max-w-xl">
              <p className="m-0 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#e8d5a3]">
                Hukum · المملكة
              </p>
              <h1 className="mt-2 mb-0 font-[family-name:var(--font-head)] text-3xl font-semibold tracking-tight md:text-4xl">
                Add product
              </h1>
              <p className="mt-1 mb-0 font-[family-name:var(--font-tajawal)] text-lg text-white/85" dir="rtl">
                أضف منتجاً إلى السوق
              </p>
              <p className="mt-3 mb-0 max-w-md text-sm leading-relaxed text-white/75">
                {stepMeta.blurb}. One calm step at a time — your listing stays draft-safe until you submit.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-right backdrop-blur-sm">
                <p className="m-0 text-[0.65rem] uppercase tracking-wider text-[#e8d5a3]">Progress</p>
                <p className="m-0 mt-1 font-[family-name:var(--font-head)] text-2xl font-semibold tabular-nums">
                  {Math.min(progressPct, 100)}%
                </p>
                <p className="m-0 mt-0.5 text-xs text-white/70">
                  Step {step + 1} / {STEPS.length}
                  {draftId ? ` · Draft ${String(draftId).slice(-6)}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-1.5">
                <Link
                  href="/dashboard/products/ai-catalogue"
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  AI catalogue
                </Link>
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
                  onClick={startNewProduct}
                >
                  Start new
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-[#c9a227]/20 px-3 py-1.5 text-xs font-semibold text-[#f0e2b8] transition hover:bg-[#c9a227]/30"
                  onClick={saveDraft}
                  disabled={saveState === "saving"}
                >
                  {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Save draft"}
                </button>
              </div>
            </div>
          </div>
          <div className="relative h-1.5 bg-black/20">
            <div
              className="h-full bg-gradient-to-r from-[#c9a227] to-[#e8d5a3] transition-all duration-500 ease-out"
              style={{ width: `${Math.min(progressPct, 100)}%` }}
            />
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)]">
          {/* Journey rail — removes confusion */}
          <aside className="hidden xl:block">
            <nav className="sticky top-4 space-y-1 rounded-2xl border border-border bg-card p-3" aria-label="Listing steps">
              <p className="mb-3 px-2 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted">Your path</p>
              {STEPS.map((s, i) => {
                const done = i < step;
                const active = i === step;
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={i > step}
                    onClick={() => i <= step && setStep(i)}
                    className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition ${
                      active
                        ? "bg-[#17634b] text-white"
                        : done
                          ? "text-text hover:bg-[#17634b]/08"
                          : "cursor-default text-muted/70"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-bold ${
                        active
                          ? "bg-[#c9a227] text-[#0b3d2e]"
                          : done
                            ? "bg-[#17634b]/15 text-[#17634b]"
                            : "bg-border/80 text-muted"
                      }`}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold leading-tight">{s.label}</span>
                      <span
                        className={`mt-0.5 block truncate text-[0.7rem] ${active ? "text-white/70" : "text-muted"}`}
                        dir="rtl"
                      >
                        {s.labelAr}
                      </span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="min-w-0 space-y-4">
            {/* Current step focus */}
            <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4">
              <div>
                <p className="m-0 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#8a6a2f]">
                  Now working on
                </p>
                <h2 className="mt-1 mb-0 font-[family-name:var(--font-head)] text-2xl font-semibold tracking-tight text-text">
                  {stepMeta.label}
                </h2>
                <p className="mt-1 mb-0 font-[family-name:var(--font-tajawal)] text-base text-muted" dir="rtl">
                  {stepMeta.labelAr}
                </p>
              </div>
              <ol className="m-0 flex list-none gap-1 p-0 xl:hidden">
                {STEPS.map((s, i) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      title={s.label}
                      disabled={i > step}
                      onClick={() => i <= step && setStep(i)}
                      className={`h-2 w-2 rounded-full transition ${
                        i === step ? "bg-[#17634b] scale-125" : i < step ? "bg-[#c9a227]" : "bg-border"
                      }`}
                    />
                  </li>
                ))}
              </ol>
            </div>

            {error ? (
              <p className="m-0 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</p>
            ) : null}
            {message && !error ? (
              <p className="m-0 rounded-xl border border-gold/30 bg-gold-muted px-4 py-3 text-sm text-gold">{message}</p>
            ) : null}

            <div
              key={step}
              className="animate-[fadeRise_0.35s_ease-out] rounded-2xl border border-border bg-card p-5 md:p-6"
            >
              {step === 0 ? (
                <div className="space-y-4">
                  <p className="m-0 text-sm text-muted">
                    Tap left → middle → right. Buyers discover you by this path.
                  </p>
                  {(selectedIndustry || selectedMainCategory || selectedCategory) && (
                    <nav
                      className="flex flex-wrap items-center gap-2 rounded-xl bg-[#17634b]/05 px-3 py-2.5 text-sm"
                      aria-label="Category path"
                    >
                      {selectedIndustry ? (
                        <button
                          type="button"
                          className="font-semibold text-[#17634b] underline-offset-2 hover:underline"
                          onClick={clearIndustry}
                        >
                          {localized(selectedIndustry.name)}
                        </button>
                      ) : null}
                      {selectedMainCategory ? (
                        <>
                          <span className="text-[#c9a227]">›</span>
                          <button
                            type="button"
                            className="font-semibold text-[#17634b] underline-offset-2 hover:underline"
                            onClick={clearMainCategory}
                          >
                            {localized(selectedMainCategory.name)}
                          </button>
                        </>
                      ) : null}
                      {selectedCategory && idOf(selectedCategory.parentId) ? (
                        <>
                          <span className="text-[#c9a227]">›</span>
                          <span className="font-bold text-text">{localized(selectedCategory.name)}</span>
                        </>
                      ) : null}
                    </nav>
                  )}

                  <div className="overflow-hidden rounded-2xl border border-[#17634b]/15 bg-gradient-to-b from-white to-[#f7faf8]">
                    <div className="grid min-h-[400px] lg:grid-cols-3">
                      <section className="flex flex-col border-b border-border lg:border-b-0 lg:border-r">
                        <div className="border-b border-border bg-[#17634b]/5 px-3 py-3">
                          <SectionLabel>1 · Industry</SectionLabel>
                          <input
                            className="input-field !min-h-10 !rounded-lg !py-2 !text-sm"
                            placeholder="Search industry…"
                            value={industrySearch}
                            onChange={(e) => setIndustrySearch(e.target.value)}
                          />
                        </div>
                        <ul className="m-0 max-h-[340px] flex-1 list-none overflow-y-auto p-1.5">
                          {visibleIndustries.length === 0 ? (
                            <li className="px-3 py-8 text-center text-sm text-muted">No match</li>
                          ) : (
                            visibleIndustries.map((ind) => {
                              const active = industryId === idOf(ind._id);
                              return (
                                <li key={idOf(ind._id)}>
                                  <button
                                    type="button"
                                    className={`group flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left transition duration-200 ${
                                      active
                                        ? "bg-[#17634b] text-white shadow-sm"
                                        : "text-text hover:bg-[#17634b]/08"
                                    }`}
                                    onClick={() => {
                                      if (industryId === idOf(ind._id)) return;
                                      setIndustryId(idOf(ind._id));
                                      clearMainCategory();
                                    }}
                                  >
                                    <span className="min-w-0 flex-1">
                                      <span className="block text-sm font-semibold leading-snug">{localized(ind.name)}</span>
                                      {ind.name?.ar ? (
                                        <span
                                          className={`mt-0.5 block text-xs ${active ? "text-white/75" : "text-muted"}`}
                                          dir="rtl"
                                        >
                                          {ind.name.ar}
                                        </span>
                                      ) : null}
                                    </span>
                                    <span className={`mt-0.5 text-sm ${active ? "text-[#e8d5a3]" : "text-muted"}`}>›</span>
                                  </button>
                                </li>
                              );
                            })
                          )}
                        </ul>
                      </section>

                      <section className="flex flex-col border-b border-border lg:border-b-0 lg:border-r">
                        <div className="border-b border-border bg-[#17634b]/5 px-3 py-3">
                          <SectionLabel>2 · Category</SectionLabel>
                          <input
                            className="input-field !min-h-10 !rounded-lg !py-2 !text-sm"
                            placeholder={industryId ? "Search category…" : "Pick industry first"}
                            value={categorySearch}
                            onChange={(e) => setCategorySearch(e.target.value)}
                            disabled={!industryId}
                          />
                        </div>
                        {!industryId ? (
                          <p className="m-auto px-6 py-12 text-center text-sm text-muted">
                            Select an industry on the left
                          </p>
                        ) : mainCategories.length === 0 ? (
                          <p className="m-auto px-6 py-12 text-center text-sm text-muted">No categories</p>
                        ) : (
                          <ul className="m-0 max-h-[340px] flex-1 list-none overflow-y-auto p-1.5">
                            {mainCategories.map((cat) => {
                              const active = mainCategoryId === idOf(cat._id);
                              return (
                                <li key={idOf(cat._id)}>
                                  <button
                                    type="button"
                                    className={`flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left transition duration-200 ${
                                      active
                                        ? "bg-[#17634b] text-white shadow-sm"
                                        : "text-text hover:bg-[#17634b]/08"
                                    }`}
                                    onClick={() => onSelectMainCategory(cat)}
                                  >
                                    <span className="min-w-0 flex-1">
                                      <span className="block text-sm font-semibold leading-snug">{localized(cat.name)}</span>
                                      {cat.name?.ar ? (
                                        <span
                                          className={`mt-0.5 block text-xs ${active ? "text-white/75" : "text-muted"}`}
                                          dir="rtl"
                                        >
                                          {cat.name.ar}
                                        </span>
                                      ) : null}
                                    </span>
                                    <span className={`mt-0.5 text-sm ${active ? "text-[#e8d5a3]" : "text-muted"}`}>›</span>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </section>

                      <section className="flex flex-col" id="product-subcategory-block">
                        <div className="border-b border-border bg-[#c9a227]/10 px-3 py-3">
                          <SectionLabel>3 · Product type</SectionLabel>
                          <input
                            className="input-field !min-h-10 !rounded-lg !py-2 !text-sm"
                            placeholder={mainCategoryId ? "Search type…" : "Pick category first"}
                            value={typeSearch}
                            onChange={(e) => setTypeSearch(e.target.value)}
                            disabled={!mainCategoryId}
                          />
                        </div>
                        {!mainCategoryId ? (
                          <p className="m-auto px-6 py-12 text-center text-sm text-muted">Select a category</p>
                        ) : showSubcategoryPanel ? (
                          <ul className="m-0 max-h-[340px] flex-1 list-none overflow-y-auto p-1.5">
                            {subcategories.map((cat) => {
                              const selected = categoryId === idOf(cat._id);
                              return (
                                <li key={idOf(cat._id)}>
                                  <button
                                    type="button"
                                    className={`flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left transition duration-200 ${
                                      selected
                                        ? "bg-[#c9a227] text-[#0b3d2e] shadow-sm"
                                        : "text-text hover:bg-[#c9a227]/15"
                                    }`}
                                    onClick={() => onSelectCategory(cat)}
                                  >
                                    <span className="min-w-0 flex-1">
                                      <span className="block text-sm font-semibold leading-snug">{localized(cat.name)}</span>
                                      {cat.name?.ar ? (
                                        <span
                                          className={`mt-0.5 block text-xs ${selected ? "text-[#0b3d2e]/75" : "text-muted"}`}
                                          dir="rtl"
                                        >
                                          {cat.name.ar}
                                        </span>
                                      ) : null}
                                    </span>
                                    {selected ? <span className="mt-0.5 text-sm font-bold">✓</span> : null}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        ) : categoryId && mainCategoryId === categoryId ? (
                          <p className="m-auto px-6 py-12 text-center text-sm font-semibold text-[#17634b]">
                            Ready — continue to information
                          </p>
                        ) : (
                          <p className="m-auto px-6 py-12 text-center text-sm text-muted">No product types here</p>
                        )}
                      </section>
                    </div>
                  </div>
                </div>
              ) : null}

              {step === 1 ? (
                <div className="space-y-6">
                  {selectedCategory ? (
                    <p className="m-0 inline-flex max-w-full items-center gap-2 rounded-xl bg-[#17634b]/08 px-3 py-2 text-xs text-[#17634b]">
                      <span className="font-bold uppercase tracking-wider text-[#8a6a2f]">Category</span>
                      <span className="truncate font-semibold text-text">{localized(selectedCategory.name)}</span>
                    </p>
                  ) : null}
                  <div>
                    <SectionLabel>Names · الأسماء</SectionLabel>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Product name (English)" required>
                        <input className="input-field" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
                      </Field>
                      <Field label="Product name (Arabic)">
                        <input className="input-field" dir="rtl" value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
                      </Field>
                    </div>
                  </div>
                  <div>
                    <SectionLabel>Identity · الهوية</SectionLabel>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Brand">
                        <input className="input-field" value={brand} onChange={(e) => setBrand(e.target.value)} />
                      </Field>
                      <Field label="Manufacturer">
                        <input className="input-field" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} />
                      </Field>
                      <Field label="SKU / product code">
                        <input className="input-field" value={sku} onChange={(e) => setSku(e.target.value)} />
                      </Field>
                      <Field label="Model number">
                        <input className="input-field" value={model} onChange={(e) => setModel(e.target.value)} />
                      </Field>
                    </div>
                  </div>
                  <div>
                    <SectionLabel>Details · التفاصيل</SectionLabel>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <Field label="Condition">
                        <select className="input-field" value={condition} onChange={(e) => setCondition(e.target.value)}>
                          {CONDITIONS.map((c) => (
                            <option key={c} value={c}>
                              {c.replaceAll("_", " ")}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Country of origin">
                        <input className="input-field" value={country} onChange={(e) => setCountry(e.target.value)} />
                      </Field>
                      <Field label="HS code">
                        <input className="input-field" value={hsCode} onChange={(e) => setHsCode(e.target.value)} />
                      </Field>
                    </div>
                    <div className="mt-4">
                      <Field label="Search tags" hint="Comma-separated — helps Saudi buyers find you">
                        <input
                          className="input-field"
                          value={tags}
                          onChange={(e) => setTags(e.target.value)}
                          placeholder="excavator, loader, construction"
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="grid max-w-3xl gap-4">
                  <Field label="Short description" hint={`${(shortDesc || "").length}/200`}>
                    <input
                      className="input-field"
                      value={shortDesc}
                      onChange={(e) => setShortDesc(e.target.value)}
                      maxLength={200}
                    />
                  </Field>
                  <Field label="Full description">
                    <textarea className="input-field min-h-36" value={descEn} onChange={(e) => setDescEn(e.target.value)} />
                  </Field>
                  <Field label="Applications / use cases">
                    <textarea
                      className="input-field min-h-24"
                      value={applications}
                      onChange={(e) => setApplications(e.target.value)}
                    />
                  </Field>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="space-y-6">
                  <div>
                    <SectionLabel>Category specifications</SectionLabel>
                    {schemaLoading ? (
                      <p className="text-sm text-muted">Loading…</p>
                    ) : (
                      <DynamicAttributeFields
                        attributes={specAttributes}
                        values={attributes}
                        errors={attrErrors}
                        onChange={(key, val) => setAttributes((prev) => ({ ...prev, [key]: val }))}
                      />
                    )}
                  </div>
                  <div>
                    <SectionLabel>Custom specifications</SectionLabel>
                    <p className="mb-3 mt-0 text-xs text-muted">Optional key / value rows.</p>
                    <KeyValueEditor rows={customSpecs} onChange={setCustomSpecs} />
                  </div>
                </div>
              ) : null}

              {step === 4 ? (
                <div>
                  <SectionLabel>Variants</SectionLabel>
                  <p className="mb-4 mt-0 text-xs text-muted">Optional. Own image, SKU, price, and stock per variant.</p>
                  <VariantEditor variants={variants} onChange={setVariants} productId={draftId} />
                </div>
              ) : null}

              {step === 5 ? (
                <div className="max-w-2xl space-y-4">
                  <label className="flex items-center gap-2 text-sm font-semibold text-text">
                    <input type="checkbox" checked={priceOnRequest} onChange={(e) => setPriceOnRequest(e.target.checked)} />
                    Price on request
                  </label>
                  {!priceOnRequest ? (
                    <Field label="Unit price">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        className="input-field"
                        value={unitPrice}
                        onChange={(e) => setUnitPrice(e.target.value)}
                      />
                    </Field>
                  ) : null}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Currency">
                      <select className="input-field" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Unit">
                      <select className="input-field" value={unit} onChange={(e) => setUnit(e.target.value)}>
                        {UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="MOQ">
                      <input
                        type="number"
                        min="0"
                        className="input-field"
                        value={moq}
                        onChange={(e) => {
                          const nextMoq = e.target.value;
                          setMoq(nextMoq);
                          setError("");
                          if (
                            nextMoq !== "" &&
                            maxOrderQty !== "" &&
                            Number(maxOrderQty) > 0 &&
                            Number(nextMoq) > Number(maxOrderQty)
                          ) {
                            setMaxOrderQty("");
                          }
                        }}
                      />
                    </Field>
                    <Field label="Max order qty" hint="Blank or ≥ MOQ">
                      <input
                        type="number"
                        min="0"
                        className="input-field"
                        value={maxOrderQty}
                        placeholder="Optional"
                        onChange={(e) => {
                          setMaxOrderQty(e.target.value);
                          setError("");
                        }}
                      />
                    </Field>
                    <Field label="Lead time">
                      <input className="input-field" value={leadTime} onChange={(e) => setLeadTime(e.target.value)} />
                    </Field>
                    <Field label="Availability">
                      <select className="input-field" value={availability} onChange={(e) => setAvailability(e.target.value)}>
                        <option value="in_stock">In stock</option>
                        <option value="made_to_order">Made to order</option>
                        <option value="limited">Limited</option>
                        <option value="out_of_stock">Out of stock</option>
                      </select>
                    </Field>
                  </div>
                  <Field label="Payment terms">
                    <input className="input-field" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
                  </Field>
                  <label className="flex items-center gap-2 text-sm font-semibold text-text">
                    <input type="checkbox" checked={sampleAvailable} onChange={(e) => setSampleAvailable(e.target.checked)} />
                    Sample available
                  </label>
                </div>
              ) : null}

              {step === 6 ? (
                <ProductImagesUploader
                  images={productImages}
                  productId={draftId || ""}
                  max={7}
                  onChange={(next) => {
                    setProductImages(next);
                    setError("");
                  }}
                />
              ) : null}

              {step === 7 ? (
                <div className="max-w-xl space-y-4">
                  <label className="flex items-center gap-2 text-sm font-semibold text-text">
                    <input type="checkbox" checked={metaAuto} onChange={(e) => setMetaAuto(e.target.checked)} />
                    Auto-generate meta from product name
                  </label>
                  <Field label="Meta title" hint={`${(metaTitle || "").length}/70`}>
                    <input
                      className="input-field"
                      value={metaTitle}
                      onChange={(e) => {
                        setMetaAuto(false);
                        setMetaTitle(e.target.value);
                      }}
                      maxLength={70}
                    />
                  </Field>
                  <Field label="Meta description" hint={`${(metaDescription || "").length}/160`}>
                    <textarea
                      className="input-field min-h-24"
                      value={metaDescription}
                      onChange={(e) => {
                        setMetaAuto(false);
                        setMetaDescription(e.target.value);
                      }}
                      maxLength={160}
                    />
                  </Field>
                  <Field label="Meta keywords">
                    <input className="input-field" value={metaKeywords} onChange={(e) => setMetaKeywords(e.target.value)} />
                  </Field>
                </div>
              ) : null}

              {step === 8 ? (
                <div className="max-w-2xl space-y-4 text-sm">
                  <div className="overflow-hidden rounded-2xl border border-[#17634b]/20 bg-gradient-to-br from-[#f7faf8] to-white">
                    <div className="border-b border-[#17634b]/10 bg-[#17634b] px-5 py-4 text-white">
                      <h3 className="m-0 font-[family-name:var(--font-head)] text-xl font-semibold">
                        {nameEn || "Untitled"}
                      </h3>
                      <p className="mt-1 mb-0 text-sm text-white/75">
                        {localized(selectedCategory?.name)} · {brand || "No brand"} · {sku || "No SKU"}
                      </p>
                    </div>
                    <div className="p-5">
                      <p className="m-0 text-text">{shortDesc || descEn || "No description"}</p>
                      {!(productImages || []).some((u) => String(u || "").trim()) ? (
                        <p className="mt-3 mb-0 text-sm text-danger">Add at least one image before submit.</p>
                      ) : null}
                      <dl className="mt-4 grid gap-3 border-t border-border pt-4 text-muted sm:grid-cols-2">
                        <div>
                          <dt className="text-[0.65rem] font-bold uppercase tracking-wider text-[#8a6a2f]">Specs</dt>
                          <dd className="m-0 text-text">
                            {Object.keys(attributes).length} category ·{" "}
                            {customSpecs.filter((r) => r.key && r.value).length} custom
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[0.65rem] font-bold uppercase tracking-wider text-[#8a6a2f]">Variants</dt>
                          <dd className="m-0 text-text">{variants.length}</dd>
                        </div>
                        <div>
                          <dt className="text-[0.65rem] font-bold uppercase tracking-wider text-[#8a6a2f]">Pricing</dt>
                          <dd className="m-0 text-text">
                            {priceOnRequest ? "Price on request" : `${unitPrice || "—"} ${currency} / ${unit}`}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[0.65rem] font-bold uppercase tracking-wider text-[#8a6a2f]">Images</dt>
                          <dd className="m-0 text-text">
                            {(productImages || []).filter((u) => String(u || "").trim()).length || 0} / 7
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                  <p className="m-0 text-muted">Submit sends this for Super Admin approval.</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-md lg:left-[248px]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            className="btn-outline"
            disabled={step === 0 || busy}
            onClick={() => {
              setError("");
              setMessage("");
              setStep((s) => Math.max(0, s - 1));
            }}
          >
            Back
          </button>
          <p className="m-0 hidden text-center text-xs text-muted sm:block">{footerHint}</p>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              className="btn-primary min-w-[8.5rem]"
              onClick={next}
              disabled={busy || (step === 0 && !categoryId)}
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary min-w-[8.5rem]"
              onClick={onSubmitForReview}
              disabled={busy || Boolean(message)}
            >
              {busy ? "Submitting…" : message ? "Submitted" : "Submit for review"}
            </button>
          )}
        </div>
      </div>
    </SellerShell>
  );
}
