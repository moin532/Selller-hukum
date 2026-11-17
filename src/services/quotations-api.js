import { apiGet, apiPatch, apiPost } from "@/lib/api-client";

export async function fetchMyQuotations() {
  const { json } = await apiGet("/api/quotations?scope=vendor");
  if (!json.success) throw new Error(json.message || "Failed to load quotations");
  return Array.isArray(json.data) ? json.data : [];
}

export async function createQuotation(body) {
  const { json } = await apiPost("/api/quotations", body);
  if (!json.success) throw new Error(json.message || "Quotation failed");
  return json.data;
}

export async function withdrawQuotation(id) {
  const { json } = await apiPatch("/api/quotations", { id, action: "withdraw" });
  if (!json.success) throw new Error(json.message || "Withdraw failed");
  return json.data;
}

export async function patchQuotation(id, action, extra = {}) {
  const { json } = await apiPatch("/api/quotations", { id, action, ...extra });
  if (!json.success) throw new Error(json.message || `${action} failed`);
  return json.data;
}

export async function fetchQuoteReminders(locale = "en") {
  const { json } = await apiGet(`/api/quotations?resource=reminders&locale=${encodeURIComponent(locale)}`);
  if (!json.success) throw new Error(json.message || "Reminders failed");
  return json.data;
}

export async function askQuoteAgent(message, context = {}) {
  const { json } = await apiPost("/api/ai/quote-agent", {
    role: "seller",
    message,
    locale: "en",
    context,
  });
  if (!json.success) throw new Error(json.message || "AI agent failed");
  return json.data;
}
