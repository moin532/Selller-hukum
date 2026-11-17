import Papa from "papaparse";

/** Canonical catalog columns (header aliases → field). */
export const CATALOG_HEADER_ALIASES = {
  sku: ["sku", "SKU", "item_code", "itemcode", "code"],
  name_en: ["name_en", "nameen", "name", "title_en", "title", "product_name", "productname"],
  name_ar: ["name_ar", "namear", "title_ar", "arabic_name", "namearabic"],
  brand: ["brand", "manufacturer", "make"],
  price: ["price", "unit_price", "unitprice", "amount"],
  currency: ["currency", "curr", "ccy"],
  moq: ["moq", "min_order", "minorder", "minimum_order", "min_qty"],
  description_en: ["description_en", "description", "desc_en", "desc"],
  description_ar: ["description_ar", "desc_ar"],
  category: ["category", "category_key", "categorykey", "category_slug", "categoryslug", "catalog_key", "catalogkey"],
  category_id: ["category_id", "categoryid"],
  status: ["status", "state"],
};

const REQUIRED_ONE_OF = ["name_en", "sku"];

function stripBom(text) {
  return String(text || "").replace(/^\uFEFF/, "");
}

function normHeader(h) {
  return String(h || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s\-]+/g, "_");
}

/** Build map: normalized incoming header → canonical field */
function buildHeaderMap(headers) {
  const aliasToCanon = {};
  for (const [canon, aliases] of Object.entries(CATALOG_HEADER_ALIASES)) {
    for (const a of aliases) aliasToCanon[normHeader(a)] = canon;
  }
  const map = {};
  const unknown = [];
  for (const h of headers) {
    const key = normHeader(h);
    if (!key) continue;
    const canon = aliasToCanon[key];
    if (canon) map[h] = canon;
    else unknown.push(h);
  }
  return { map, unknown };
}

function isBlankRow(obj) {
  return Object.values(obj).every((v) => String(v ?? "").trim() === "");
}

function toNumberOrNull(raw, field, rowNumber, errors) {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const n = Number(s.replace(/,/g, ""));
  if (Number.isNaN(n)) {
    errors.push({ row: rowNumber, field, message: `Invalid number "${raw}"` });
    return null;
  }
  return n;
}

/**
 * Parse catalog CSV text → normalized rows + errors (with row + field).
 * Uses Papa Parse (quoted commas, BOM, blank skip).
 */
export function parseCatalogCsv(text) {
  const errors = [];
  const parsed = Papa.parse(stripBom(text), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => String(h || "").replace(/^\uFEFF/, "").trim(),
  });

  if (parsed.errors?.length) {
    for (const e of parsed.errors) {
      errors.push({
        row: typeof e.row === "number" ? e.row + 2 : null, // +2: header is row 1, Papa row is 0-based data
        field: null,
        message: e.message || "CSV parse error",
      });
    }
  }

  const rawHeaders = parsed.meta?.fields || [];
  if (!rawHeaders.length) {
    return {
      rows: [],
      errors: [{ row: 1, field: null, message: "Missing header row" }],
      headers: [],
      unknownHeaders: [],
    };
  }

  const { map, unknown } = buildHeaderMap(rawHeaders);
  const mappedCanons = new Set(Object.values(map));
  if (![...REQUIRED_ONE_OF].some((f) => mappedCanons.has(f))) {
    errors.push({
      row: 1,
      field: "name_en|sku",
      message: `Header must include name_en or sku. Found: ${rawHeaders.join(", ")}`,
    });
  }

  const rows = [];
  (parsed.data || []).forEach((raw, idx) => {
    const rowNumber = idx + 2; // 1-based file row (header = 1)
    if (!raw || typeof raw !== "object") return;
    if (isBlankRow(raw)) return;

    const out = {
      sku: "",
      name_en: "",
      name_ar: "",
      brand: "",
      price: "",
      currency: "SAR",
      moq: "",
      description_en: "",
      description_ar: "",
      category: "",
      category_id: "",
      status: "",
      _row: rowNumber,
    };

    for (const [orig, canon] of Object.entries(map)) {
      const val = raw[orig];
      if (val == null) continue;
      out[canon] = String(val).trim();
    }

    if (!out.name_en && !out.sku) {
      errors.push({
        row: rowNumber,
        field: "name_en|sku",
        message: "Row needs name_en or sku",
      });
      return;
    }

    // Validate numeric fields early (preview + server)
    if (out.price !== "") {
      const n = toNumberOrNull(out.price, "price", rowNumber, errors);
      if (n != null) {
        if (n < 0) {
          errors.push({ row: rowNumber, field: "price", message: "Price must be 0 or greater" });
          out.price = "";
        } else out.price = String(n);
      } else out.price = "";
    }
    if (out.moq !== "") {
      const n = toNumberOrNull(out.moq, "moq", rowNumber, errors);
      if (n != null) {
        if (n < 0) {
          errors.push({ row: rowNumber, field: "moq", message: "MOQ must be 0 or greater" });
          out.moq = "";
        } else out.moq = String(n);
      } else out.moq = "";
    }

    rows.push(out);
  });

  return {
    rows,
    errors,
    headers: rawHeaders,
    unknownHeaders: unknown,
  };
}
