"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, MessageCircle, RefreshCw } from "lucide-react";
import { SellerShell } from "@/components/layout/SellerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fetchVendorInquiries, updateInquiryStatus } from "@/services/inquiries-api";
import { apiGet } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

const NOTES_KEY = "kt_leads_crm_notes";
const STAGE_KEY = "kt_leads_crm_stages";
const CRM_STAGES = ["new", "contacted", "qualified", "quoted", "won", "lost", "follow_up"];

function loadMap(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
}

/** Map RFQ/server statuses onto CRM pipeline stages (accept → Won). */
function mapCrmStage(rawStatus, override) {
  if (override && CRM_STAGES.includes(override)) return override;
  const s = String(rawStatus || "").toLowerCase();
  if (["won", "awarded", "accepted", "deal_confirmed", "reviewed"].includes(s)) return "won";
  if (["lost", "cancelled", "closed", "rejected", "declined"].includes(s)) return "lost";
  if (["quoted", "negotiation"].includes(s)) return "quoted";
  if (["qualified", "matching", "viewed"].includes(s)) return "qualified";
  if (["contacted", "invited"].includes(s)) return "contacted";
  if (["new", "open", "draft"].includes(s)) return "new";
  if (CRM_STAGES.includes(s)) return s;
  return "follow_up";
}

function sourceLabel(raw) {
  const type = raw?.extras?.requestType || raw?.source || raw?.extras?.via || "";
  if (type === "hukum_relay" || type === "hukum_ai" || String(raw?.source || "").includes("hukum")) {
    return "Lead from Hukum";
  }
  if (type === "contact_reveal" || String(type).startsWith("contact_reveal")) return "Contact unlock";
  if (type === "product_interest" || String(raw?.source || "").includes("product_interest")) return "Heart interest";
  if (raw?.enquiryType === "buyer" && raw?.extras?.productId) return "Product inquiry";
  return "Website form";
}

export default function LeadsCrmPage() {
  const [inquiries, setInquiries] = useState([]);
  const [rfqs, setRfqs] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [busy, setBusy] = useState("");
  const [notes, setNotes] = useState({});
  const [stages, setStages] = useState({});
  const [expanded, setExpanded] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [inq, rfqRes, remRes] = await Promise.all([
        fetchVendorInquiries().catch(() => []),
        apiGet("/api/rfqs?scope=vendor"),
        apiGet("/api/quotations?resource=reminders&locale=en"),
      ]);
      setInquiries(Array.isArray(inq) ? inq : []);
      setRfqs(rfqRes.json?.success && Array.isArray(rfqRes.json.data) ? rfqRes.json.data : []);
      setReminders(
        remRes.json?.success && Array.isArray(remRes.json.data?.reminders)
          ? remRes.json.data.reminders
          : []
      );
      setNotes(loadMap(NOTES_KEY));
      setStages(loadMap(STAGE_KEY));
    } catch (e) {
      setError(e.message || "Failed to load leads");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const unified = useMemo(() => {
    const rows = [
      ...inquiries.map((i) => ({
        id: `inq-${i._id}`,
        kind: "inquiry",
        stage: mapCrmStage(i.status || i.crmStage || "new", stages[`inq-${i._id}`]),
        title: i.extras?.productName || i.subject || "Buyer lead",
        buyer: i.fullName || i.companyName || i.phone || "Buyer",
        phone: i.phone || "",
        email: i.email || "",
        at: i.createdAt,
        href: null,
        raw: i,
        channel: sourceLabel(i),
        ref: i.reference || "",
      })),
      ...rfqs.map((r) => ({
        id: `rfq-${r._id}`,
        kind: "rfq",
        stage: mapCrmStage(r.crmStage || r.status || "open", stages[`rfq-${r._id}`]),
        title: r.title?.en || r.title || "RFQ",
        buyer: r.buyerId?.name || r.buyerId?.email || "Buyer",
        phone: "",
        email: r.buyerId?.email || "",
        at: r.createdAt,
        href: `/dashboard/rfqs/${r._id}`,
        raw: r,
        channel: "RFQ invite",
        ref: String(r._id).slice(-6),
      })),
    ].sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
    if (tab === "inquiry") return rows.filter((r) => r.kind === "inquiry");
    if (tab === "rfq") return rows.filter((r) => r.kind === "rfq");
    if (tab === "action")
      return rows.filter((r) =>
        ["new", "invited", "open", "matching", "follow_up", "reviewing"].includes(r.stage)
      );
    if (tab === "wa") return rows.filter((r) => r.phone);
    if (tab === "reveal")
      return rows.filter(
        (r) =>
          r.raw?.extras?.requestType === "contact_reveal" ||
          r.raw?.extras?.requestType === "hukum_relay" ||
          r.raw?.extras?.via === "hukum_relay" ||
          String(r.raw?.source || "").includes("contact_reveal") ||
          String(r.raw?.source || "").includes("hukum")
      );
    return rows;
  }, [inquiries, rfqs, tab, stages]);

  const stats = useMemo(
    () => [
      { label: "Total", value: inquiries.length + rfqs.length },
      { label: "Website / unlock", value: inquiries.length },
      { label: "RFQ invites", value: rfqs.length },
      {
        label: "Needs action",
        value: unified.filter((r) =>
          ["new", "invited", "open", "matching", "follow_up", "reviewing"].includes(r.stage)
        ).length,
      },
    ],
    [inquiries.length, rfqs.length, unified]
  );

  async function markInquiry(id, status) {
    setBusy(id);
    try {
      await updateInquiryStatus(id, status);
      await load();
    } catch (e) {
      setError(e.message || "Update failed");
    } finally {
      setBusy("");
    }
  }

  function saveNote(id, note) {
    const next = { ...notes, [id]: note };
    setNotes(next);
    localStorage.setItem(NOTES_KEY, JSON.stringify(next));
  }

  function saveStage(id, stage) {
    const next = { ...stages, [id]: stage };
    setStages(next);
    localStorage.setItem(STAGE_KEY, JSON.stringify(next));
  }

  return (
    <SellerShell title="Leads CRM">
      <PageHeader
        title="Leads CRM"
        subtitle="Leads from the marketplace website, contact unlocks, heart interest, and RFQ invites."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
            <Link
              href="/dashboard/matched-leads"
              className="rounded-lg border border-border px-3 py-2 text-sm font-semibold"
            >
              Matched leads
            </Link>
            <Link
              href="/dashboard/inbox"
              className="rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-white"
            >
              Quote Inbox
            </Link>
          </div>
        }
      />

      <div className="mb-5 rounded-xl border border-border bg-card p-4 text-sm">
        <p className="m-0 font-semibold text-text">How leads arrive from the client website</p>
        <ul className="mt-2 mb-0 list-disc space-y-1 ps-5 text-muted">
          <li>
            <strong className="text-text">Contact unlock</strong> — buyer reveals your phone/WhatsApp on a
            product or storefront page → appears here as “Contact unlock”.
          </li>
          <li>
            <strong className="text-text">Heart interest</strong> — buyer taps interest + OTP on a product →
            “Heart interest”.
          </li>
          <li>
            <strong className="text-text">Product inquiry / form</strong> — request-quote or contact form with
            your vendor id → inquiry row.
          </li>
          <li>
            <strong className="text-text">RFQ invite</strong> — buyer RFQ matched to your category → RFQ
            invite tab / Open RFQ.
          </li>
        </ul>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="m-0 text-[10px] uppercase tracking-wide text-muted">{s.label}</p>
            <p className="mt-1 mb-0 text-xl font-semibold text-text">{s.value}</p>
          </div>
        ))}
      </div>

      {reminders.some((r) => r.type === "buyer_question_pending") ? (
        <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <p className="m-0 font-semibold text-text">Awaiting your reply</p>
          <p className="mt-1 mb-0 text-xs text-muted">
            Buyer clarifying questions are pending — respond from Quote Inbox or the RFQ thread.
          </p>
        </div>
      ) : null}

      {reminders.length > 0 ? (
        <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {reminders.slice(0, 6).map((r) => (
            <div
              key={r.id}
              className={`rounded-xl border bg-card p-3 text-sm ${
                r.type === "buyer_question_pending" ? "border-amber-500/50" : "border-border"
              }`}
            >
              <p className="m-0 text-[10px] uppercase tracking-wide text-muted">
                {r.type === "buyer_question_pending" ? "awaiting your reply" : r.type}
              </p>
              <p className="mt-1 mb-0 font-semibold text-text">{r.title}</p>
              <p className="mt-1 mb-0 text-xs text-muted">{r.body}</p>
              {r.href ? (
                <Link href={r.href} className="mt-2 inline-flex text-xs font-semibold text-gold">
                  Open
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          ["all", "All leads"],
          ["action", "Needs action"],
          ["reveal", "Contact unlocks"],
          ["wa", "WhatsApp"],
          ["inquiry", "Inquiries"],
          ["rfq", "RFQ invites"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              tab === id ? "border-gold bg-gold/15 text-text" : "border-border text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : unified.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <p className="m-0 text-sm font-semibold text-text">No leads yet</p>
          <p className="mt-2 mb-0 text-sm text-muted">
            Publish products, share your storefront, and wait for buyers to unlock contact or send RFQs on
            the marketplace.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href="/dashboard/products" className="btn-outline text-sm">
              Products
            </Link>
            <Link href="/dashboard/storefront" className="btn-primary text-sm">
              Storefront
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {unified.map((row) => (
            <article key={row.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                      {row.channel}
                    </span>
                    {row.ref ? <span className="text-[10px] text-muted">#{row.ref}</span> : null}
                  </div>
                  <p className="m-0 font-medium text-text">{row.title}</p>
                  <p className="mt-0.5 mb-0 text-xs text-muted">
                    {row.buyer} · {row.at ? formatDate(row.at) : "—"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="rounded-lg border border-border bg-bg px-2 py-1 text-xs"
                    value={CRM_STAGES.includes(row.stage) ? row.stage : mapCrmStage(row.stage)}
                    onChange={(e) => saveStage(row.id, e.target.value)}
                  >
                    {CRM_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                  <StatusBadge value={row.stage} />
                  <button
                    type="button"
                    className="text-xs font-semibold text-muted"
                    onClick={() => setExpanded(expanded === row.id ? "" : row.id)}
                  >
                    {expanded === row.id ? "Hide" : "Notes"}
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-3">
                {row.kind === "rfq" && row.href ? (
                  <Link href={row.href} className="inline-flex items-center gap-1 text-xs font-semibold text-gold">
                    Open RFQ <ExternalLink size={12} />
                  </Link>
                ) : null}
                {row.kind === "inquiry" ? (
                  <button
                    type="button"
                    disabled={busy === String(row.raw._id)}
                    onClick={() => void markInquiry(row.raw._id, "replied")}
                    className="text-xs font-semibold text-gold disabled:opacity-50"
                  >
                    Mark replied
                  </button>
                ) : null}
                {row.phone ? (
                  <a
                    href={`https://wa.me/${String(row.phone).replace(/\D/g, "")}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-gold"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle size={12} /> WhatsApp
                  </a>
                ) : null}
                {row.email && !String(row.email).includes("@hukum-ksa.com") && !String(row.email).includes("@kingdomtrade.demo") ? (
                  <a href={`mailto:${row.email}`} className="text-xs font-semibold text-muted">
                    Email
                  </a>
                ) : null}
              </div>

              {expanded === row.id ? (
                <label className="mt-3 block text-xs text-muted">
                  Notes & follow-ups
                  <textarea
                    className="input-field mt-1 w-full text-sm"
                    rows={2}
                    value={notes[row.id] || ""}
                    onChange={(e) => saveNote(row.id, e.target.value)}
                    placeholder="Call back Thursday · sent brochure…"
                  />
                </label>
              ) : notes[row.id] ? (
                <p className="mt-2 mb-0 text-xs text-muted">{notes[row.id]}</p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </SellerShell>
  );
}
