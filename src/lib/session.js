const TOKEN_KEY = "kt_seller_token";
const USER_KEY = "kt_seller_user";

export function getSellerToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getSellerUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSellerSession(user, token) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSellerSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isSellerAccount(user) {
  if (!user) return false;
  const roles = user.roles || [];
  return Boolean(user.vendorId) || roles.some((r) => String(r).startsWith("vendor"));
}
