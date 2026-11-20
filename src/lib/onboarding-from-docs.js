/** Session key for company fields extracted from uploaded verification docs. */
export const EXTRACTED_FIELDS_KEY = "kt_onboarding_extracted";

/** All verification / brochure uploads are readable for company basics. */
const DOC_TYPES_FOR_EXTRACT = new Set([
  "commercial_registration",
  "vat_certificate",
  "national_address",
  "brochure",
  "company_profile",
  "other",
]);

export function shouldExtractFromDocType(docType) {
  const t = String(docType || "").trim();
  if (!t) return true;
  return DOC_TYPES_FOR_EXTRACT.has(t);
}

function sanitizeFields(fields) {
  if (!fields || typeof fields !== "object") return {};
  const out = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    if (typeof value === "object") continue; // never store nested meta/fields blobs
    const s = String(value).trim();
    if (!s) continue;
    out[key] = s;
  }
  return out;
}

/** Merge extracts: never replace a filled value with empty; keep stronger IDs/names. */
export function mergeExtractedFields(base, incoming) {
  const out = { ...sanitizeFields(base) };
  const next = sanitizeFields(incoming);
  for (const [k, v] of Object.entries(next)) {
    if (!v) continue;
    const prev = out[k];
    if (!prev) {
      out[k] = v;
      continue;
    }
    if (k === "crNumber" && /^\d{10}$/.test(v)) {
      out[k] = v;
      continue;
    }
    if (k === "vatNumber" && /^3\d{13}3$/.test(v)) {
      out[k] = v;
      continue;
    }
    if (k === "email" && /@/.test(v)) {
      out[k] = v;
      continue;
    }
    if ((k === "legalNameEn" || k === "legalNameAr" || k === "tradeName") && v.length > String(prev).length + 3) {
      out[k] = v;
      continue;
    }
    // Keep existing filled value on re-upload (prevents wiping business name / email)
  }
  return out;
}

export function saveExtractedFields(fields, meta = {}) {
  if (!fields || typeof fields !== "object") return;
  try {
    const prev = loadExtractedFields();
    const merged = mergeExtractedFields(prev?.fields || {}, fields);
    sessionStorage.setItem(
      EXTRACTED_FIELDS_KEY,
      JSON.stringify({
        fields: merged,
        meta: {
          ...(prev?.meta || {}),
          ...meta,
          updatedAt: Date.now(),
        },
      })
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadExtractedFields() {
  try {
    const raw = sessionStorage.getItem(EXTRACTED_FIELDS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    // Support legacy corrupted shape where fields accidentally nested
    let fields = parsed.fields;
    if (fields && typeof fields === "object" && fields.fields && typeof fields.fields === "object") {
      fields = { ...sanitizeFields(fields.fields), ...sanitizeFields(fields) };
      delete fields.fields;
      delete fields.meta;
    }
    return {
      fields: sanitizeFields(fields || parsed),
      meta: parsed.meta && typeof parsed.meta === "object" ? parsed.meta : {},
    };
  } catch {
    return null;
  }
}

export function clearExtractedFields() {
  try {
    sessionStorage.removeItem(EXTRACTED_FIELDS_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Map extracted onboarding fields → vendor PATCH payload.
 * Only includes non-empty values. Never sends empty legalName.en/ar that would wipe DB.
 */
export function vendorUpdatesFromExtracted(fields) {
  const f = sanitizeFields(fields);
  if (!Object.keys(f).length) return null;

  const updates = {};

  // Only patch language sides that were actually extracted (never wipe the other)
  if (f.legalNameEn || f.legalNameAr) {
    const legalName = {};
    if (f.legalNameEn) legalName.en = f.legalNameEn;
    if (f.legalNameAr) legalName.ar = f.legalNameAr;
    updates.legalName = legalName;
  }
  if (f.tradeName) updates.tradeName = f.tradeName;
  if (f.companyType) updates.companyType = f.companyType;
  if (f.crNumber && /^\d{10}$/.test(f.crNumber)) updates.crNumber = f.crNumber;
  if (f.vatNumber && /^3\d{13}3$/.test(f.vatNumber)) updates.vatNumber = f.vatNumber;
  if (f.yearEstablished) {
    const y = Number(f.yearEstablished);
    if (Number.isFinite(y)) updates.yearEstablished = y;
  }
  if (f.website) updates.website = f.website;
  if (f.email) updates.email = f.email;
  if (f.phone) updates.phone = f.phone;
  if (f.whatsapp) updates.whatsapp = f.whatsapp;
  if (f.descriptionEn || f.descriptionAr) {
    const description = {};
    if (f.descriptionEn) description.en = f.descriptionEn;
    if (f.descriptionAr) description.ar = f.descriptionAr;
    updates.description = description;
  }
  if (f.city || f.region || f.address || f.postalCode || f.country) {
    updates.location = {
      country: f.country || "SA",
      ...(f.region ? { region: f.region } : {}),
      ...(f.city ? { city: f.city } : {}),
      ...(f.address ? { address: f.address } : {}),
      ...(f.postalCode ? { postalCode: f.postalCode } : {}),
    };
  }
  if (f.marketsServed) {
    updates.marketsServed = f.marketsServed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (f.paymentTerms) updates.paymentTerms = f.paymentTerms;
  if (f.leadTime) updates.leadTime = f.leadTime;
  if (f.moq) updates.moq = f.moq;
  if (f.authorizedRep) {
    updates.legal = {
      authorizedRepresentative: f.authorizedRep,
      registrationCountry: "SA",
    };
  }
  return Object.keys(updates).length ? updates : null;
}
