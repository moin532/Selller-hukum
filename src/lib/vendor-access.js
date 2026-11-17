/** Seller catalog/activity is locked until Super Admin verifies the company. */
export function isVendorVerified(vendor) {
  return vendor?.verificationStatus === "verified";
}

export function vendorLockMessage(vendor, lang = "en") {
  const status = vendor?.verificationStatus || "unverified";
  const reason = String(vendor?.verificationRejectionReason || "").trim();
  const isAr = lang === "ar";

  if (status === "verified") return "";
  if (status === "rejected") {
    if (isAr) {
      return reason
        ? `تم الرفض: ${reason}. صحّح البيانات وأعد رفع المستندات ثم أرسل مرة أخرى. لا يمكن إضافة منتجات حتى تتم الموافقة.`
        : "تم رفض التحقق. صحّح الملف والمستندات ثم أعد الإرسال. لا يمكن إضافة منتجات حتى تتم الموافقة.";
    }
    return reason
      ? `Rejected: ${reason}. Fix issues / re-upload documents, then resubmit. You cannot add products until verified.`
      : "Verification rejected. Fix profile/documents and resubmit. You cannot add products until verified.";
  }
  if (status === "pending") {
    return isAr
      ? "حسابك بانتظار موافقة سوبر أدمن. لا يمكن إضافة منتجات أو إرسال نشاط حتى تتم الموافقة."
      : "Waiting for Super Admin approval. You cannot add products or submit seller activity until verified.";
  }
  if (status === "suspended") {
    return isAr ? "الحساب معلّق." : "Your seller account is suspended.";
  }
  return isAr
    ? "أكمل التحقق أولاً. إضافة المنتجات وإرسال النشاط مقفل حتى الموافقة."
    : "Complete verification first. Product creation and activity submit stay locked until approved.";
}
