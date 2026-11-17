const TONES = {
  verified: "border-success text-success",
  approved: "border-success text-success",
  published: "border-success text-success",
  active: "border-success text-success",
  accepted: "border-success text-success",
  submitted: "border-gold text-gold",
  pending: "border-gold text-gold",
  under_review: "border-gold text-gold",
  open: "border-gold text-gold",
  draft: "border-border text-muted",
  rejected: "border-danger text-danger",
  suspended: "border-danger text-danger",
  cancelled: "border-danger text-danger",
};

export function StatusBadge({ value }) {
  const raw = String(value || "unknown");
  const key = raw.toLowerCase().replace(/\s+/g, "_");
  const tone = TONES[key] || "border-border text-muted";
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs capitalize ${tone}`}>
      {raw.replace(/_/g, " ")}
    </span>
  );
}
