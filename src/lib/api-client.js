import { clearSellerSession, getSellerToken } from "@/lib/session";

/** Live Hukum Backend API — always used on Cloudhost / client machines. */
export const PRODUCTION_API_URL = "https://api.hukum-ksa.com";

/**
 * Resolve API origin.
 * Default: production API (so Cloudhost / client PCs never call 127.0.0.1).
 * Local Backend only when NEXT_PUBLIC_USE_LOCAL_API=1 or NEXT_PUBLIC_API_URL is set.
 */
function resolveApiBase() {
  const fromEnv = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/$/, "");
  if (fromEnv && !/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(fromEnv)) {
    return fromEnv;
  }

  const useLocal =
    process.env.NEXT_PUBLIC_USE_LOCAL_API === "1" ||
    process.env.NEXT_PUBLIC_USE_LOCAL_API === "true";

  if (useLocal) {
    return (fromEnv || "http://127.0.0.1:4000").replace(/\/$/, "");
  }

  // Production / Cloudhost / any remote client → live Hukum API
  return (process.env.NEXT_PUBLIC_HUKUM_API_URL || PRODUCTION_API_URL).replace(/\/$/, "");
}

export function apiUrl(path) {
  const base = resolveApiBase();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export async function apiFetch(path, options = {}) {
  const token = getSellerToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(apiUrl(path), { ...options, headers, credentials: "include" });
  } catch {
    return {
      res: null,
      json: {
        success: false,
        message: `Cannot reach Hukum API at ${apiUrl(path)}. Check your connection.`,
        data: null,
      },
      status: 0,
    };
  }
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = { success: false, message: "Invalid server response", data: null };
  }

  if (res.status === 401) {
    clearSellerSession();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
  }

  return { res, json, status: res.status };
}

export async function apiGet(path) {
  return apiFetch(path, { method: "GET" });
}

export async function apiPost(path, body) {
  return apiFetch(path, { method: "POST", body: JSON.stringify(body) });
}

export async function apiPatch(path, body) {
  return apiFetch(path, { method: "PATCH", body: JSON.stringify(body) });
}

/** Authenticated binary/text download (CSV, etc.) — do not use plain <a href> (no Bearer). */
export async function apiDownload(path, filename = "download") {
  const token = getSellerToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(apiUrl(path), { method: "GET", headers, credentials: "include" });
  } catch {
    throw new Error(`Cannot reach Hukum API at ${apiUrl(path)}`);
  }

  if (res.status === 401) {
    clearSellerSession();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  const contentType = res.headers.get("content-type") || "";
  if (!res.ok || contentType.includes("application/json")) {
    let message = "Download failed";
    try {
      const json = await res.json();
      message = json.message || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
