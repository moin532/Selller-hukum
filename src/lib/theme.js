const THEME_KEY = "kt_seller_theme";
const LANG_KEY = "kt_seller_lang";

export function getStoredTheme() {
  if (typeof window === "undefined") return "light";
  const raw = localStorage.getItem(THEME_KEY);
  if (raw === "dark") return "dark";
  return "light";
}

export function applyTheme(theme) {
  const next = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem(THEME_KEY, next);
  return next;
}

export function getStoredLang() {
  if (typeof window === "undefined") return "en";
  return localStorage.getItem(LANG_KEY) === "ar" ? "ar" : "en";
}

export function applyLang(lang) {
  const next = lang === "ar" ? "ar" : "en";
  document.documentElement.setAttribute("lang", next);
  document.documentElement.setAttribute("dir", next === "ar" ? "rtl" : "ltr");
  localStorage.setItem(LANG_KEY, next);
  return next;
}
