export function localized(obj, fallback = "—") {
  if (!obj) return fallback;
  if (typeof obj === "string") return obj;
  return obj.en || obj.ar || fallback;
}

export function money(amount, currency = "SAR") {
  if (amount == null || Number.isNaN(Number(amount))) return "—";
  return `${currency} ${Number(amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "—";
  }
}

export function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}
