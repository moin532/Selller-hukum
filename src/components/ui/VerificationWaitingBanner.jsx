"use client";

import Link from "next/link";
import { Clock, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { vendorLockMessage } from "@/lib/vendor-access";
import { cn } from "@/lib/utils";

/**
 * Persistent seller banner until Super Admin verifies the company.
 * verificationStatus: unverified | pending | verified | rejected | suspended
 */
export function VerificationWaitingBanner({ vendor, lang = "en" }) {
  if (!vendor) return null;

  const status = vendor.verificationStatus || "unverified";
  if (status === "verified") return null;

  const isAr = lang === "ar";
  const company = vendor.legalName?.en || vendor.tradeName || (isAr ? "شركتك" : "your company");
  const reason = String(vendor.verificationRejectionReason || "").trim();
  const lockNote = vendorLockMessage(vendor, lang);

  const copy = {
    pending: {
      Icon: Clock,
      tone: "waiting",
      title: isAr ? "في انتظار موافقة الإدارة" : "Waiting for Super Admin approval",
      body: isAr
        ? `طلب التحقق لـ «${company}» قيد المراجعة. لا يمكنك إضافة منتجات أو إرسال نشاط حتى تتم الموافقة.`
        : `Your verification for “${company}” is under review. Product creation and activity submit stay locked until approved.`,
    },
    unverified: {
      Icon: ShieldAlert,
      tone: "warn",
      title: isAr ? "أكمل التحقق من الشركة" : "Complete company verification",
      body: isAr
        ? "أكمل ملف الشركة والمستندات ثم أرسل الطلب. إضافة المنتجات مقفلة حتى الموافقة."
        : "Finish your company profile and documents, then submit. Adding products stays locked until approval.",
    },
    rejected: {
      Icon: ShieldX,
      tone: "danger",
      title: isAr ? "تم رفض التحقق — أعد الرفع / صحّح" : "Verification rejected — fix & re-upload",
      body: isAr
        ? "راجع سبب الرفض أدناه، صحّح البيانات أو أعد رفع المستندات، ثم أرسل مرة أخرى."
        : "Read the rejection reason below, fix details or re-upload documents, then resubmit for approval.",
    },
    suspended: {
      Icon: ShieldX,
      tone: "danger",
      title: isAr ? "الحساب معلّق" : "Account suspended",
      body: isAr
        ? "تم تعليق التحقق. تواصل مع الدعم أو راجع مركز التحقق."
        : "Verification is suspended. Contact support or check the verification center.",
    },
  };

  const cfg = copy[status] || copy.unverified;
  const Icon = cfg.Icon;

  return (
    <aside
      role="status"
      className={cn(
        "mb-5 flex items-start gap-3.5 rounded-xl border p-4",
        cfg.tone === "waiting" && "border-gold/40 bg-gold-muted",
        cfg.tone === "warn" && "border-border bg-surface",
        cfg.tone === "danger" && "border-danger/40 bg-danger/10"
      )}
    >
      <div
        className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-card text-gold"
        aria-hidden
      >
        <Icon size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 className="m-0 text-[0.98rem] font-semibold text-text">{cfg.title}</h2>
          <StatusBadge value={status} />
        </div>
        <p className="mt-1.5 mb-0 text-sm leading-snug text-muted">{cfg.body}</p>
        {reason ? (
          <div className="mt-2.5 rounded-[10px] border border-danger/35 bg-danger/10 px-3 py-2.5">
            <p className="m-0 text-[0.7rem] uppercase tracking-wide text-danger">
              {isAr ? "سبب الرفض" : "Rejection reason"}
            </p>
            <p className="mt-1 mb-0 text-sm leading-snug text-text">{reason}</p>
          </div>
        ) : null}
        <p className="mt-2 mb-0 text-xs font-semibold text-gold">{lockNote}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/dashboard/verification" className="btn-primary">
            {status === "rejected"
              ? isAr
                ? "إعادة الرفع والإرسال"
                : "Re-upload & resubmit"
              : isAr
                ? "مركز التحقق"
                : "Verification center"}
          </Link>
          <Link href="/dashboard/company-profile" className="btn-outline">
            {isAr ? "ملف الشركة" : "Company profile"}
          </Link>
        </div>
      </div>
    </aside>
  );
}

export function VerificationWaitingCard({ vendor, lang = "en" }) {
  if (!vendor) return null;
  const status = vendor.verificationStatus || "unverified";
  const reason = String(vendor.verificationRejectionReason || "").trim();

  if (status === "verified") {
    return (
      <section className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-emerald-500/35 bg-card p-4">
        <ShieldCheck size={20} className="text-emerald-500" />
        <div className="min-w-0 flex-1">
          <h2 className="m-0 text-sm font-semibold text-text">
            {lang === "ar" ? "الشركة موثّقة" : "Company verified"}
          </h2>
          <p className="mt-1 mb-0 text-sm text-muted">
            {lang === "ar"
              ? "يمكنك إضافة المنتجات وإرسال النشاط."
              : "You can add products and submit seller activity."}
          </p>
        </div>
        <StatusBadge value="verified" />
      </section>
    );
  }

  return (
    <section
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border p-4",
        status === "rejected" ? "border-danger/40 bg-danger/10" : "border-gold/40 bg-gold-muted"
      )}
    >
      {status === "rejected" ? (
        <ShieldX size={22} className="text-danger" />
      ) : (
        <Clock size={22} className="text-gold" />
      )}
      <div className="min-w-0 flex-1">
        <h2 className="m-0 text-base font-semibold text-text">
          {status === "pending"
            ? lang === "ar"
              ? "بانتظار الموافقة — المنتجات مقفلة"
              : "Waiting for approval — products locked"
            : status === "rejected"
              ? lang === "ar"
                ? "مرفوض — أعد الرفع"
                : "Rejected — re-upload required"
              : lang === "ar"
                ? "التحقق غير مكتمل"
                : "Verification not complete"}
        </h2>
        <p className="mt-1 mb-0 text-sm text-muted">{vendorLockMessage(vendor, lang)}</p>
        {reason ? <p className="mt-2 mb-0 text-sm text-danger">{reason}</p> : null}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge value={status} />
          <StatusBadge value={vendor.status || "draft"} />
          <span className="text-xs text-muted">
            {lang === "ar" ? "اكتمال الملف" : "Profile"} {vendor.completenessScore ?? 0}%
          </span>
        </div>
      </div>
      <Link href="/dashboard/verification" className="btn-primary shrink-0">
        {status === "rejected"
          ? lang === "ar"
            ? "إصلاح وإعادة إرسال"
            : "Fix & resubmit"
          : lang === "ar"
            ? "متابعة"
            : "Track status"}
      </Link>
    </section>
  );
}
