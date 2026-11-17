"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { SellerShell } from "@/components/layout/SellerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FileUploader } from "@/components/ui/FileUploader";
import {
  DynamicAttributeFields,
  validateMandatoryAttributes,
} from "@/components/products/DynamicAttributeFields";
import { KeyValueEditor } from "@/components/products/KeyValueEditor";
import { VariantEditor } from "@/components/products/VariantEditor";
import { categoryKeyOf, fetchCategoryTree, fetchProductForm, localized } from "@/services/categories-api";
import { fetchProduct, submitProduct, updateProduct } from "@/services/products-api";
import { mediaAbsoluteUrl } from "@/services/uploads-api";
import { getSellerUser } from "@/lib/session";
import { productTitle } from "@/lib/product-display";

const CURRENCIES = ["SAR", "USD", "EUR", "AED"];
const UNITS = ["piece", "box", "kg", "ton", "meter", "set", "pair", "liter", "roll", "pack"];
const CONDITIONS = ["new", "refurbished", "used", "made_to_order", "sample"];
const AVAILABILITY = ["in_stock", "made_to_order", "limited", "out_of_stock"];

function autoMetaTitle(name, brand) {
  return [name, brand, "Saudi Arabia"].filter(Boolean).join(" | ").slice(0, 70);
}

function autoMetaDescription(shortDesc, desc, name) {
  const raw = shortDesc || desc || `Buy ${name || "this product"} on Hukum B2B marketplace.`;
  return String(raw).replace(/\s+/g, " ").trim().slice(0, 160);
}

function Section({ title, children }) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-5">
      <h2 className="m-0 text-xs font-semibold uppercase tracking-wide text-gold">{title}</h2>
      {children}
    </section>
  );
}

export default function EditProductPage() {
  const { id } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [formSchema, setFormSchema] = useState(null);
  const [tree, setTree] = useState({ industries: [], categories: [] });
  const [categoryId, setCategoryId] = useState("");
  const [industryId, setIndustryId] = useState("");
  const [attrErrors, setAttrErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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
  const [imageUrl, setImageUrl] = useState("");
  const [galleryUrls, setGalleryUrls] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaKeywords, setMetaKeywords] = useState("");
  const [metaH1, setMetaH1] = useState("");
  const [metaAuto, setMetaAuto] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const p = await fetchProduct(String(id));
        if (!alive) return;
        const vendorId = typeof p.vendorId === "object" ? String(p.vendorId?._id || "") : String(p.vendorId || "");
        const mine = getSellerUser()?.vendorId;
        if (mine && vendorId && vendorId !== mine) {
          setError("Forbidden — this product belongs to another seller.");
          return;
        }
        setProduct(p);
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
        if (attrs.model && !(p.modelNumber || p.model)) setModel(attrs.model);
        const cid = String(p.categoryId?._id || p.categoryId || "");
        setCategoryId(cid);
        const specs = Array.isArray(p.customSpecifications) && p.customSpecifications.length
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

        const media = Array.isArray(p.media) ? [...p.media] : [];
        media.sort((a, b) => {
          if (a.isPrimary && !b.isPrimary) return -1;
          if (!a.isPrimary && b.isPrimary) return 1;
          return (a.order || 0) - (b.order || 0);
        });
        setImageUrl(media[0]?.url || "");
        setGalleryUrls(media.slice(1).map((m) => m.url).filter(Boolean).join("\n"));

        setMetaTitle(p.seo?.title?.en || "");
        setMetaDescription(p.seo?.description?.en || "");
        setMetaKeywords(p.seo?.keywords?.en || "");
        setMetaH1(p.seo?.h1?.en || p.name?.en || "");
        setMetaAuto(false);

        const loadedTree = await fetchCategoryTree();
        if (alive) setTree(loadedTree);
        const cat = (loadedTree.categories || []).find(
          (c) => String(c._id) === String(p.categoryId?._id || p.categoryId)
        );
        if (alive && cat) {
          setIndustryId(String(cat.industryId?._id || cat.industryId || ""));
        }
        const key = categoryKeyOf(cat);
        if (key) {
          const schema = await fetchProductForm(key);
          if (alive) setFormSchema(schema);
        }
      } catch (e) {
        if (alive) setError(e.message || "Load failed");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    if (!metaAuto) return;
    setMetaTitle(autoMetaTitle(nameEn, brand));
    setMetaDescription(autoMetaDescription(shortDesc, descEn, nameEn));
    setMetaH1(nameEn);
  }, [metaAuto, nameEn, brand, shortDesc, descEn]);

  useEffect(() => {
    if (!categoryId) return;
    const cat = (tree.categories || []).find((c) => String(c._id) === String(categoryId));
    const key = categoryKeyOf(cat);
    if (!key) return;
    let alive = true;
    fetchProductForm(key)
      .then((schema) => {
        if (alive) setFormSchema(schema);
      })
      .catch(() => {
        if (alive) setFormSchema(null);
      });
    return () => {
      alive = false;
    };
  }, [categoryId, tree.categories]);

  const selectedCategory = useMemo(
    () => (tree.categories || []).find((c) => String(c._id) === String(categoryId)),
    [tree.categories, categoryId]
  );

  const industryCategories = useMemo(() => {
    if (!industryId) return tree.categories || [];
    return (tree.categories || []).filter(
      (c) => String(c.industryId?._id || c.industryId) === String(industryId)
    );
  }, [tree.categories, industryId]);

  const IDENTITY_ATTR_KEYS = useMemo(() => new Set(["brand", "model", "country_of_origin"]), []);

  const specAttributes = useMemo(() => {
    const attrs = formSchema?.attributes || [];
    return attrs.filter(
      (a) =>
        ["general", "technical", "physical", "performance", "commercial"].includes(a.group) &&
        !IDENTITY_ATTR_KEYS.has(a.key)
    );
  }, [formSchema, IDENTITY_ATTR_KEYS]);

  function buildMedia() {
    const urls = [imageUrl, ...galleryUrls.split("\n").map((s) => s.trim())].filter(Boolean);
    const unique = [...new Set(urls)];
    return unique.map((url, i) => ({
      url,
      type: "image",
      order: i,
      isPrimary: i === 0,
      alt: { en: nameEn || "Product image", ar: nameAr || "" },
    }));
  }

  function buildPayload() {
    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
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
        status: v.status || "active",
      }));

    return {
      name: { en: nameEn.trim(), ar: nameAr.trim() },
      title: { en: nameEn.trim(), ar: nameAr.trim() },
      description: { en: descEn, ar: product?.description?.ar || "" },
      shortDescription: { en: shortDesc, ar: product?.shortDescription?.ar || "" },
      applications: { en: applications, ar: product?.applications?.ar || "" },
      brand: brand || undefined,
      manufacturer: manufacturer || undefined,
      sku: sku || undefined,
      modelNumber: model || undefined,
      model: model || undefined,
      condition,
      tags: tagList,
      searchTags: tagList,
      categoryId: categoryId || undefined,
      industryId: industryId || undefined,
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
      maxOrderQty: maxOrderQty === "" ? undefined : Number(maxOrderQty),
      leadTime: leadTime || undefined,
      paymentTerms: paymentTerms || undefined,
      sampleAvailable,
      availability,
      media: buildMedia(),
      countryOfOrigin: country,
      hsCode: hsCode || undefined,
      origin: { countryOfOrigin: country },
      seo: {
        title: { en: metaTitle || autoMetaTitle(nameEn, brand), ar: product?.seo?.title?.ar || "" },
        description: {
          en: metaDescription || autoMetaDescription(shortDesc, descEn, nameEn),
          ar: product?.seo?.description?.ar || "",
        },
        keywords: { en: metaKeywords || tagList.join(", "), ar: product?.seo?.keywords?.ar || "" },
        h1: { en: metaH1 || nameEn.trim(), ar: nameAr.trim() },
        indexable: product?.seo?.indexable !== false,
      },
    };
  }

  function validatePricingAndMedia({ requireImage = false } = {}) {
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
    if (
      moq !== "" &&
      maxOrderQty !== "" &&
      Number(maxOrderQty) < Number(moq)
    ) {
      setError("Max order quantity must be greater than or equal to MOQ");
      return false;
    }
    if (requireImage && !imageUrl.trim() && !galleryUrls.trim()) {
      setError("Upload at least one product image before submitting");
      return false;
    }
    if (!categoryId) {
      setError("Select a category");
      return false;
    }
    return true;
  }

  async function onSave(e) {
    e.preventDefault();
    if (!nameEn.trim()) {
      setError("Product name (EN) is required");
      return;
    }
    if (!validatePricingAndMedia()) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const saved = await updateProduct(String(id), buildPayload());
      const refreshed = await fetchProduct(String(id));
      setProduct(refreshed);
      if (saved?.reReview || refreshed?.status === "submitted") {
        setMessage(
          "Saved. Because this listing was live, it was sent back for admin review and is no longer public until approved."
        );
      } else {
        setMessage("Saved. SEO, media, pricing, and specs updated.");
      }
    } catch (err) {
      setError(err.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit() {
    if (busy) return;
    const errs = validateMandatoryAttributes(specAttributes, attributes);
    if (Object.keys(errs).length) {
      setAttrErrors(errs);
      setError("Complete required attributes before submit");
      return;
    }
    if (!validatePricingAndMedia({ requireImage: true })) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await updateProduct(String(id), buildPayload());
      await submitProduct(String(id));
      setMessage("Submitted for admin review.");
      router.replace("/dashboard/products");
    } catch (err) {
      setError(err.message || "Submit failed");
      setBusy(false);
    }
  }

  return (
    <SellerShell title="Edit product">
      <PageHeader
        title={product ? `Edit · ${productTitle(product)}` : "Edit product"}
        subtitle="Update identity, pricing, images, specs, and SEO / meta before submitting for review."
        actions={
          <div className="flex gap-2">
            <Link href={`/dashboard/products/${id}`} className="btn-outline">
              View detail
            </Link>
            <button type="button" className="btn-outline" onClick={() => router.push("/dashboard/products")}>
              Back
            </button>
          </div>
        }
      />
      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
      {message ? <p className="mb-3 text-sm text-gold">{message}</p> : null}
      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : product ? (
        <form onSubmit={onSave} className="space-y-5">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
            <StatusBadge value={product.status} />
            {selectedCategory ? (
              <span className="text-xs text-muted">Category: {localized(selectedCategory.name)}</span>
            ) : categoryId ? (
              <span className="text-xs text-muted">Category ID: {categoryId}</span>
            ) : null}
            {formSchema ? <span className="text-xs text-muted">Template: {formSchema.templateKey}</span> : null}
          </div>

          <Section title="Category">
            <p className="m-0 text-xs text-muted">
              Changing category reloads specification fields and will send a published listing back for review.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-muted">
                Industry
                <select
                  className="input-field mt-1"
                  value={industryId}
                  onChange={(e) => {
                    setIndustryId(e.target.value);
                    setCategoryId("");
                  }}
                >
                  <option value="">All industries</option>
                  {(tree.industries || []).map((ind) => (
                    <option key={String(ind._id)} value={String(ind._id)}>
                      {localized(ind.name)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-muted">
                Category *
                <select
                  className="input-field mt-1"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                >
                  <option value="">Select category…</option>
                  {industryCategories.map((cat) => (
                    <option key={String(cat._id)} value={String(cat._id)}>
                      {localized(cat.name)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </Section>

          <Section title="Identity">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-muted sm:col-span-2">
                Name (EN) *
                <input className="input-field mt-1" value={nameEn} onChange={(e) => setNameEn(e.target.value)} required />
              </label>
              <label className="block text-sm text-muted sm:col-span-2">
                Name (AR)
                <input className="input-field mt-1" dir="rtl" value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
              </label>
              <label className="block text-sm text-muted">
                SKU
                <input className="input-field mt-1" value={sku} onChange={(e) => setSku(e.target.value)} />
              </label>
              <label className="block text-sm text-muted">
                Brand
                <input className="input-field mt-1" value={brand} onChange={(e) => setBrand(e.target.value)} />
              </label>
              <label className="block text-sm text-muted">
                Manufacturer
                <input className="input-field mt-1" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} />
              </label>
              <label className="block text-sm text-muted">
                Model
                <input className="input-field mt-1" value={model} onChange={(e) => setModel(e.target.value)} />
              </label>
              <label className="block text-sm text-muted">
                Condition
                <select className="input-field mt-1" value={condition} onChange={(e) => setCondition(e.target.value)}>
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-muted">
                Country of origin
                <input className="input-field mt-1" value={country} onChange={(e) => setCountry(e.target.value)} />
              </label>
              <label className="block text-sm text-muted">
                HS code
                <input className="input-field mt-1" value={hsCode} onChange={(e) => setHsCode(e.target.value)} />
              </label>
              <label className="block text-sm text-muted sm:col-span-2">
                Tags (comma separated)
                <input className="input-field mt-1" value={tags} onChange={(e) => setTags(e.target.value)} />
              </label>
            </div>
          </Section>

          <Section title="Description">
            <label className="block text-sm text-muted">
              Short description (EN)
              <textarea className="input-field mt-1 min-h-20" value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} />
            </label>
            <label className="block text-sm text-muted">
              Full description (EN)
              <textarea className="input-field mt-1 min-h-28" value={descEn} onChange={(e) => setDescEn(e.target.value)} />
            </label>
            <label className="block text-sm text-muted">
              Applications (EN)
              <textarea className="input-field mt-1 min-h-20" value={applications} onChange={(e) => setApplications(e.target.value)} />
            </label>
          </Section>

          <Section title="Pricing & trade">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={priceOnRequest} onChange={(e) => setPriceOnRequest(e.target.checked)} />
              Price on request
            </label>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {!priceOnRequest ? (
                <label className="block text-sm text-muted">
                  Unit price
                  <input
                    className="input-field mt-1"
                    type="number"
                    min="0"
                    step="any"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                  />
                </label>
              ) : null}
              <label className="block text-sm text-muted">
                Currency
                <select className="input-field mt-1" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-muted">
                Unit
                <select className="input-field mt-1" value={unit} onChange={(e) => setUnit(e.target.value)}>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-muted">
                MOQ
                <input className="input-field mt-1" type="number" min="0" value={moq} onChange={(e) => setMoq(e.target.value)} />
              </label>
              <label className="block text-sm text-muted">
                Max order qty
                <input
                  className="input-field mt-1"
                  type="number"
                  min="0"
                  value={maxOrderQty}
                  onChange={(e) => setMaxOrderQty(e.target.value)}
                />
              </label>
              <label className="block text-sm text-muted">
                Lead time
                <input className="input-field mt-1" value={leadTime} onChange={(e) => setLeadTime(e.target.value)} />
              </label>
              <label className="block text-sm text-muted">
                Payment terms
                <input className="input-field mt-1" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
              </label>
              <label className="block text-sm text-muted">
                Availability
                <select className="input-field mt-1" value={availability} onChange={(e) => setAvailability(e.target.value)}>
                  {AVAILABILITY.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input type="checkbox" checked={sampleAvailable} onChange={(e) => setSampleAvailable(e.target.checked)} />
                Sample available
              </label>
            </div>
          </Section>

          <Section title="Images">
            <FileUploader
              kind="product"
              label="Upload image"
              productId={String(id)}
              previewUrl={imageUrl ? mediaAbsoluteUrl(imageUrl) : ""}
              onUploaded={(file) => {
                const url = file?.url || "";
                if (!imageUrl) setImageUrl(url);
                else setGalleryUrls((prev) => (prev ? `${prev}\n${url}` : url));
              }}
            />
            <label className="block text-sm text-muted">
              Primary image URL
              <input className="input-field mt-1" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
            </label>
            <label className="block text-sm text-muted">
              Additional image URLs (one per line)
              <textarea className="input-field mt-1 min-h-24" value={galleryUrls} onChange={(e) => setGalleryUrls(e.target.value)} />
            </label>
          </Section>

          <Section title="Category specifications">
            {specAttributes.length ? (
              <DynamicAttributeFields
                attributes={specAttributes}
                values={attributes}
                errors={attrErrors}
                onChange={(key, val) => setAttributes((prev) => ({ ...prev, [key]: val }))}
              />
            ) : (
              <p className="m-0 text-sm text-muted">No category attribute template loaded for this product.</p>
            )}
            <div className="pt-2">
              <p className="mb-2 text-sm font-medium text-text">Custom specifications</p>
              <KeyValueEditor rows={customSpecs} onChange={setCustomSpecs} />
            </div>
          </Section>

          <Section title="Variants">
            <VariantEditor variants={variants} onChange={setVariants} productId={String(id)} />
          </Section>

          <Section title="SEO / Meta">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={metaAuto} onChange={(e) => setMetaAuto(e.target.checked)} />
              Auto-generate meta title & description from product name
            </label>
            <label className="block text-sm text-muted">
              Meta title
              <input
                className="input-field mt-1"
                value={metaTitle}
                maxLength={70}
                onChange={(e) => {
                  setMetaAuto(false);
                  setMetaTitle(e.target.value);
                }}
              />
              <span className="text-xs">{(metaTitle || "").length}/70</span>
            </label>
            <label className="block text-sm text-muted">
              Meta description
              <textarea
                className="input-field mt-1 min-h-24"
                value={metaDescription}
                maxLength={160}
                onChange={(e) => {
                  setMetaAuto(false);
                  setMetaDescription(e.target.value);
                }}
              />
              <span className="text-xs">{(metaDescription || "").length}/160</span>
            </label>
            <label className="block text-sm text-muted">
              Meta keywords
              <input className="input-field mt-1" value={metaKeywords} onChange={(e) => setMetaKeywords(e.target.value)} />
            </label>
            <label className="block text-sm text-muted">
              SEO H1
              <input className="input-field mt-1" value={metaH1} onChange={(e) => setMetaH1(e.target.value)} />
            </label>
          </Section>

          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? "Saving…" : "Save all changes"}
            </button>
            {product.status === "draft" || product.status === "rejected" || product.status === "changes_requested" ? (
              <button
                type="button"
                className="btn-outline"
                disabled={busy || Boolean(message && /submitted/i.test(message))}
                onClick={onSubmit}
              >
                {busy ? "Submitting…" : "Submit for review"}
              </button>
            ) : null}
            <Link href={`/dashboard/products/${id}`} className="btn-outline">
              Cancel
            </Link>
          </div>
        </form>
      ) : null}
    </SellerShell>
  );
}
