import { apiUrl } from "@/lib/api-client";
import { getSellerToken } from "@/lib/session";

async function parseJson(res) {
  let json = null;
  try {
    json = await res.json();
  } catch {
    throw new Error("Invalid server response");
  }
  if (!json.success) throw new Error(json.message || "AI extract failed");
  return json.data;
}

/** Extract company profile from a public website URL. */
export async function extractFromWebsite(url) {
  const token = getSellerToken();
  const form = new FormData();
  form.append("kind", "url");
  form.append("url", url);
  const res = await fetch(apiUrl("/api/ai/onboarding"), {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  return parseJson(res);
}

/** Extract from PDF, Excel, or image (JPG/PNG/WebP) file. */
export async function extractFromFile(file) {
  if (!file) throw new Error("No file selected");
  const token = getSellerToken();
  const form = new FormData();
  const name = String(file.name || "").toLowerCase();
  const mime = String(file.type || "").toLowerCase();
  let kind = "excel";
  if (name.endsWith(".pdf") || mime.includes("pdf")) kind = "pdf";
  else if (mime.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/i.test(name)) kind = "image";
  form.append("kind", kind);
  form.append("file", file);
  const res = await fetch(apiUrl("/api/ai/onboarding"), {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  return parseJson(res);
}
