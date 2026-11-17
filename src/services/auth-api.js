import { apiGet, apiPost } from "@/lib/api-client";
import { clearSellerSession, isSellerAccount, setSellerSession } from "@/lib/session";
// apiGet used after login to repair missing vendorId

function sellerGateError(user) {
  const roles = (user?.roles || []).map((r) => String(r).toLowerCase());
  const isStaff = roles.some((r) =>
    ["admin", "super_admin", "vendor_verification_admin", "content_admin", "ops_admin"].includes(r)
  );
  const isBuyer = roles.includes("buyer") || roles.some((r) => r.startsWith("buyer_"));

  if (isStaff) {
    return "This is a staff/admin account. Sign in here with a seller email (for example seller@hukum-ksa.com), or open the admin panel for staff access.";
  }
  if (isBuyer) {
    return "This is a buyer account. Use a seller email and password here, or create a seller account.";
  }
  return "This email is not registered as a seller. Use your seller login, or create a seller account.";
}

function persistSession(user, token) {
  if (!isSellerAccount(user)) {
    throw new Error(sellerGateError(user));
  }
  setSellerSession(
    {
      id: user.id,
      email: user.email,
      name: user.name || "Seller",
      roles: user.roles || [],
      vendorId: user.vendorId,
      preferredLanguage: user.preferredLanguage || "en",
    },
    token
  );
}

export async function loginSeller(email, password) {
  const { json } = await apiPost("/api/auth", { action: "login", email, password });
  if (!json.success || !json.data?.token || !json.data?.user) {
    throw new Error(json.message || "Login failed");
  }
  const user = { ...json.data.user };
  // Ensure vendorId is present for seller dashboards (API may re-link on login).
  if (!user.vendorId) {
    try {
      const mine = await apiGet("/api/vendors?mine=true");
      if (mine.json?.success && mine.json.data?._id) {
        user.vendorId = String(mine.json.data._id);
      }
    } catch {
      /* ignore — registration flow may create vendor next */
    }
  }
  persistSession(user, json.data.token);
  return user;
}

function readAcquisition() {
  try {
    const raw = localStorage.getItem("kt_acquisition_v1");
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  try {
    const qs = new URLSearchParams(window.location.search);
    const acq = {
      source: qs.get("utm_source") || qs.get("source") || undefined,
      medium: qs.get("utm_medium") || undefined,
      campaign: qs.get("utm_campaign") || undefined,
      ref: qs.get("ref") || qs.get("referral") || undefined,
      landingPath: window.location.pathname,
      capturedAt: new Date().toISOString(),
    };
    if (acq.source || acq.ref) localStorage.setItem("kt_acquisition_v1", JSON.stringify(acq));
    return acq;
  } catch {
    return undefined;
  }
}

/** Creates vendor_owner + draft Vendor via POST /api/auth action=register. */
export async function registerSeller({ email, password, name, mobile, companyName, preferredLanguage = "en" }) {
  const { json } = await apiPost("/api/auth", {
    action: "register",
    accountType: "vendor",
    email,
    password,
    name,
    mobile,
    companyName,
    preferredLanguage,
    acquisition: readAcquisition(),
  });
  if (!json.success || !json.data?.token || !json.data?.user) {
    throw new Error(json.message || "Registration failed");
  }
  persistSession(json.data.user, json.data.token);
  return json.data.user;
}

/** Google / Microsoft SSO for sellers (demo path when OAuth secrets unset). */
export async function ssoSeller(provider) {
  const { json } = await apiPost("/api/auth", {
    action: "oauth_sso",
    provider,
    accountType: "vendor",
    acquisition: readAcquisition(),
  });
  if (!json.success || !json.data?.token || !json.data?.user) {
    throw new Error(json.message || "SSO failed");
  }
  persistSession(json.data.user, json.data.token);
  return json.data.user;
}

export async function logoutSeller() {
  try {
    await apiPost("/api/auth", { action: "logout" });
  } catch {
    /* ignore */
  }
  clearSellerSession();
}

export async function fetchMe() {
  const { json, status } = await apiGet("/api/auth?action=me");
  if (status === 401 || !json.success) throw new Error(json.message || "Unauthorized");
  return json.data;
}
