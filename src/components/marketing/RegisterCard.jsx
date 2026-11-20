"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/providers/ThemeProvider";
import { t } from "@/lib/marketing-i18n";
import { registerSeller } from "@/services/auth-api";
import { updateMyVendor } from "@/services/company-api";

const BUSINESS_TYPES = [
  { id: "manufacturer", en: "Manufacturer", ar: "مصنّع" },
  { id: "distributor", en: "Distributor / trader", ar: "موزّع / تاجر" },
  { id: "wholesaler", en: "Wholesaler", ar: "تاجر جملة" },
  { id: "trading_company", en: "Trading company", ar: "شركة تجارية" },
  { id: "service_provider", en: "Service provider", ar: "مقدّم خدمات" },
  { id: "other", en: "Other", ar: "أخرى" },
];

const CITIES = ["Riyadh", "Jeddah", "Dammam", "Khobar", "Mecca", "Medina", "Abha", "Tabuk", "Other"];

function toE164(raw) {
  const phone = String(raw || "").trim().replace(/\s/g, "");
  if (!phone) return "";
  if (phone.startsWith("+")) return phone;
  return `+966${phone.replace(/^0+/, "")}`;
}

export function RegisterCard() {
  const router = useRouter();
  const { lang } = useTheme();
  const [name, setName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [mobile, setMobile] = useState("");
  const [city, setCity] = useState("Riyadh");
  const [cityOther, setCityOther] = useState("");
  const [businessType, setBusinessType] = useState("trading_company");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (!consent) {
      setError(lang === "ar" ? "يجب الموافقة على الشروط" : "Please accept the terms to continue");
      return;
    }
    if (!email.trim() || !password || password.length < 8) {
      setError(lang === "ar" ? "البريد وكلمة مرور من ٨ أحرف مطلوبة" : "Email and password (min 8) are required");
      return;
    }
    if (!name.trim()) {
      setError(lang === "ar" ? "الاسم مطلوب" : "Full name is required");
      return;
    }
    if (!mobile.trim() || mobile.trim().length < 9) {
      setError(lang === "ar" ? "رقم الجوال مطلوب" : "Saudi mobile number is required");
      return;
    }

    const phone = toE164(mobile);
    const resolvedCity = city === "Other" ? cityOther.trim() || "Other" : city;

    setBusy(true);
    try {
      // Company / business name is filled next from uploaded documents (AI read)
      await registerSeller({
        email: email.trim(),
        password,
        name: name.trim(),
        mobile: phone,
        preferredLanguage: lang,
      });

      try {
        await updateMyVendor({
          email: email.trim(),
          phone,
          whatsapp: phone,
          companyType: businessType,
          location: { city: resolvedCity, country: "SA" },
          legal: {
            authorizedRepresentative: [name.trim(), jobTitle.trim()].filter(Boolean).join(" — "),
          },
        });
      } catch {
        /* profile can be completed in next steps */
      }

      try {
        sessionStorage.setItem("kt_onboarding_businessType", businessType);
        sessionStorage.setItem("kt_onboarding_jobTitle", jobTitle.trim());
        sessionStorage.setItem("kt_onboarding_city", resolvedCity);
      } catch {
        /* ignore */
      }

      router.replace("/register/documents");
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="seller-reg-card">
      <div className="seller-reg-card__head">
        <p className="seller-reg-card__step">
          {lang === "ar" ? "الخطوة ١ من ٤ — إنشاء الحساب" : "Step 1 of 4 — Create account"}
        </p>
        <h2 className="seller-reg-card__title">{t(lang, "regTitle")}</h2>
        <ol className="seller-reg-steps" aria-hidden>
          <li className="is-active">1</li>
          <li>2</li>
          <li>3</li>
          <li>4</li>
        </ol>
        <p className="seller-reg-steps__labels">
          <span>{lang === "ar" ? "الحساب" : "Account"}</span>
          <span>{lang === "ar" ? "المستندات" : "Documents"}</span>
          <span>{lang === "ar" ? "الشركة" : "Company"}</span>
          <span>{lang === "ar" ? "مراجعة" : "Review"}</span>
        </p>
      </div>

      <fieldset className="seller-reg-section">
        <legend>{t(lang, "secContact")}</legend>
        <div className="seller-reg-grid">
          <label className="seller-reg-field seller-reg-field--full">
            {t(lang, "fieldName")} *
            <input
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              disabled={busy}
            />
          </label>
          <label className="seller-reg-field">
            {t(lang, "fieldJobTitle")}
            <input
              className="input-field"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder={lang === "ar" ? "مثال: مدير مبيعات" : "e.g. Sales Manager"}
              disabled={busy}
            />
          </label>
          <label className="seller-reg-field">
            {lang === "ar" ? "الجوال / واتساب *" : "Mobile / WhatsApp *"}
            <div className="seller-reg-phone">
              <span>+966</span>
              <input
                className="input-field"
                inputMode="tel"
                placeholder="5XXXXXXXX"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/[^\d]/g, "").slice(0, 9))}
                autoComplete="tel-national"
                required
                disabled={busy}
              />
            </div>
          </label>
        </div>
        <p className="seller-reg-hint">
          {lang === "ar"
            ? "نستخدم نفس الرقم لواتساب. يمكنك تغييره لاحقاً من الملف الشخصي."
            : "We use this number for WhatsApp too. You can change it later in your profile."}
        </p>
      </fieldset>

      <fieldset className="seller-reg-section">
        <legend>{t(lang, "secCompany")}</legend>
        <p className="seller-reg-hint">
          {lang === "ar"
            ? "اسم الشركة يُقرأ تلقائياً من مستنداتك في الخطوة التالية (السجل / الضريبة / البروشور)."
            : "Company / business name is read automatically from your documents in the next step (CR, VAT/GST, or brochure)."}
        </p>
        <div className="seller-reg-grid">
          <label className="seller-reg-field">
            {t(lang, "fieldCity")} *
            <select className="input-field" value={city} onChange={(e) => setCity(e.target.value)} disabled={busy}>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          {city === "Other" ? (
            <label className="seller-reg-field">
              {t(lang, "fieldCityOther")}
              <input
                className="input-field"
                value={cityOther}
                onChange={(e) => setCityOther(e.target.value)}
                disabled={busy}
              />
            </label>
          ) : null}
        </div>
        <p className="seller-reg-hint">{t(lang, "fieldBusinessType")}</p>
        <div className="seller-reg-types">
          {BUSINESS_TYPES.map((item) => (
            <label
              key={item.id}
              className={`seller-reg-type ${businessType === item.id ? "is-active" : ""}`}
            >
              <input
                type="radio"
                className="sr-only"
                name="businessType"
                value={item.id}
                checked={businessType === item.id}
                onChange={() => setBusinessType(item.id)}
                disabled={busy}
              />
              <span>{lang === "ar" ? item.ar : item.en}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="seller-reg-section">
        <legend>{t(lang, "secAccount")}</legend>
        <div className="seller-reg-grid">
          <label className="seller-reg-field seller-reg-field--full">
            {t(lang, "fieldEmail")} *
            <input
              className="input-field"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={busy}
            />
          </label>
          <label className="seller-reg-field seller-reg-field--full">
            {t(lang, "fieldPassword")} *
            <input
              className="input-field"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              disabled={busy}
              placeholder={lang === "ar" ? "٨ أحرف على الأقل" : "At least 8 characters"}
            />
          </label>
        </div>
      </fieldset>

      <label className="seller-reg-consent">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          disabled={busy}
        />
        <span>{t(lang, "fieldConsent")}</span>
      </label>

      {error ? <p className="seller-reg-error">{error}</p> : null}

      <button type="submit" className="btn-primary seller-reg-submit" disabled={busy}>
        {busy
          ? lang === "ar"
            ? "جارٍ إنشاء الحساب…"
            : "Creating account…"
          : lang === "ar"
            ? "متابعة لرفع المستندات"
            : "Continue to upload documents"}
      </button>
    </form>
  );
}
