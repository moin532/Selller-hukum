"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Inbox,
  MessageCircle,
  Phone,
  RefreshCw,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { SellerShell } from "@/components/layout/SellerShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fetchVendorInquiries, updateInquiryStatus } from "@/services/inquiries-api";
import { apiGet } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

const NOTES_KEY = "kt_leads_crm_notes";
const STAGE_KEY = "kt_leads_crm_stages";
const CRM_STAGES = ["new", "contacted", "qualified", "quoted", "won", "lost", "follow_up"];

const STAGE_TONE = {
  new: "bg-emerald-500/15 text-emerald-800 border-emerald-500/25",
  contacted: "bg-sky-500/15 text-sky-800 border-sky-500/25",
  qualified: "bg-violet-500/15 text-violet-800 border-violet-500/25",
  quoted: "bg-amber-500/15 text-amber-900 border-amber-500/30",
  won: "bg-gold-muted text-gold border-gold/30",
  lost: "bg-rose-500/10 text-rose-700 border-rose-500/25",
  follow_up: "bg-orange-500/15 text-orange-900 border-orange-500/25",
};

function loadMap(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
}

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
  const [showGuide, setShowGuide] = useState(false);

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

  const pipeline = useMemo(() => {
    const all = [
      ...inquiries.map((i) => mapCrmStage(i.status || i.crmStage || "new", stages[`inq-${i._id}`])),
      ...rfqs.map((r) => mapCrmStage(r.crmStage || r.status || "open", stages[`rfq-${r._id}`])),
    ];
    return CRM_STAGES.map((s) => ({
      id: s,
      label: s.replace(/_/g, " "),
      count: all.filter((x) => x === s).length,
    }));
  }, [inquiries, rfqs, stages]);

  const stats = useMemo(
    () => [
      { label: "All leads", value: inquiries.length + rfqs.length, icon: Users },
      { label: "Website / unlock", value: inquiries.length, icon: Phone },
      { label: "RFQ invites", value: rfqs.length, icon: Inbox },
      {
        label: "Needs action",
        value: unified.filter((r) =>
          ["new", "invited", "open", "matching", "follow_up", "reviewing"].includes(r.stage)
        ).length,
        icon: Target,
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
    <SellerShell title="Leads">
      <section className="relative mb-6 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-[#0f3d2e] via-[#17634b] to-[#1a4d3a] px-5 py-6 text-white sm:px-7 sm:py-7">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #c9a962 0, transparent 40%), radial-gradient(circle at 80% 0%, #fff 0, transparent 28%)",
          }}
          aria-hidden
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <p className="m-0 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f0e2c0]">
              <Sparkles size={12} aria-hidden /> Pipeline
            </p>
            <h1 className="mt-3 mb-0 text-2xl font-semibold tracking-tight sm:text-[1.75rem]">Leads</h1>
            <p className="mt-2 mb-0 text-sm leading-relaxed text-white/80">
              Contact unlocks, product interest, and RFQ invites — move each buyer through your pipeline.
            </p>
          </div>
          <div className="relative flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/15"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
            <Link
              href="/dashboard/matched-leads"
              className="rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
            >
              Matched
            </Link>
            <Link
              href="/dashboard/inbox"
              className="rounded-xl bg-[#c9a962] px-3 py-2 text-sm font-semibold text-[#1a2e24] hover:bg-[#d4b56e]"
            >
              Quote Inbox
            </Link>
          </div>
        </div>
      </section>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border bg-card p-4 shadow-[0_8px_24px_-18px_rgba(16,37,28,0.35)]"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-muted">{s.label}</p>
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-gold-muted text-gold">
                <s.icon size={15} aria-hidden />
              </span>
            </div>
            <p className="mt-2 mb-0 text-2xl font-semibold tracking-tight text-text">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2">
          {pipeline.map((p) => (
            <div
              key={p.id}
              className={`rounded-xl border px-3 py-2 ${STAGE_TONE[p.id] || "border-border bg-card text-muted"}`}
            >
              <p className="m-0 text-[10px] font-semibold uppercase tracking-wide opacity-80">{p.label}</p>
              <p className="mt-0.5 mb-0 text-lg font-semibold tabular-nums">{p.count}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {[
            ["all", "All"],
            ["action", "Needs action"],
            ["reveal", "Unlocks"],
            ["wa", "WhatsApp"],
            ["inquiry", "Inquiries"],
            ["rfq", "RFQs"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                tab === id
                  ? "border-gold bg-gold text-white shadow-sm"
                  : "border-border bg-card text-muted hover:border-gold/40 hover:text-text"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="text-xs font-semibold text-gold"
          onClick={() => setShowGuide((v) => !v)}
        >
          {showGuide ? "Hide guide" : "How leads arrive"}
        </button>
      </div>

      {showGuide ? (
        <div className="mb-5 rounded-2xl border border-gold/20 bg-gold-muted/40 px-4 py-3 text-sm text-muted">
          <ul className="m-0 list-disc space-y-1 ps-5">
            <li>
              <strong className="text-text">Contact unlock</strong> — buyer reveals phone on a product or storefront.
            </li>
            <li>
              <strong className="text-text">Heart interest</strong> — buyer taps interest + OTP on a product.
            </li>
            <li>
              <strong className="text-text">RFQ invite</strong> — matched buyer request in your category.
            </li>
          </ul>
        </div>
      ) : null}

      {reminders.some((r) => r.type === "buyer_question_pending") ? (
        <div className="mb-4 rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm">
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
              className={`rounded-2xl border bg-card p-3.5 text-sm ${
                r.type === "buyer_question_pending" ? "border-amber-500/50" : "border-border"
              }`}
            >
              <p className="m-0 text-[10px] font-semibold uppercase tracking-wide text-muted">
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

      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted">Loading leads…</div>
      ) : unified.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gold-muted text-gold">
            <Users size={22} aria-hidden />
          </span>
          <p className="mt-4 mb-0 text-base font-semibold text-text">No leads yet</p>
          <p className="mt-2 mb-0 text-sm text-muted">
            Publish products and share your storefront — unlocks and RFQs will land here.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/dashboard/products" className="btn-outline text-sm">
              Products
            </Link>
            <Link href="/dashboard/storefront" className="btn-primary text-sm">
              Storefront
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {unified.map((row) => (
            <article
              key={row.id}
              className="rounded-2xl border border-border bg-card p-4 shadow-[0_10px_28px_-22px_rgba(16,37,28,0.45)] transition hover:border-gold/25"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                      {row.channel}
                    </span>
                    {row.ref ? <span className="text-[10px] text-muted">#{row.ref}</span> : null}
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${
                        STAGE_TONE[row.stage] || "border-border text-muted"
                      }`}
                    >
                      {String(row.stage).replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="m-0 text-[15px] font-semibold text-text">{row.title}</p>
                  <p className="mt-1 mb-0 text-xs text-muted">
                    {row.buyer} · {row.at ? formatDate(row.at) : "—"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="rounded-xl border border-border bg-bg px-2.5 py-1.5 text-xs font-medium"
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
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-muted hover:bg-surface hover:text-text"
                    onClick={() => setExpanded(expanded === row.id ? "" : row.id)}
                  >
                    {expanded === row.id ? "Hide" : "Notes"}
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {row.kind === "rfq" && row.href ? (
                  <Link
                    href={row.href}
                    className="inline-flex items-center gap-1 rounded-full border border-gold/25 bg-gold-muted px-3 py-1 text-xs font-semibold text-gold"
                  >
                    Open RFQ <ExternalLink size={12} />
                  </Link>
                ) : null}
                {row.kind === "inquiry" ? (
                  <button
                    type="button"
                    disabled={busy === String(row.raw._id)}
                    onClick={() => void markInquiry(row.raw._id, "replied")}
                    className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-text disabled:opacity-50"
                  >
                    Mark replied
                  </button>
                ) : null}
                {row.phone ? (
                  <a
                    href={`https://wa.me/${String(row.phone).replace(/\D/g, "")}`}
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-800"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle size={12} /> WhatsApp
                  </a>
                ) : null}
                {row.email &&
                !String(row.email).includes("@hukum-ksa.com") &&
                !String(row.email).includes("@kingdomtrade.demo") ? (
                  <a
                    href={`mailto:${row.email}`}
                    className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted"
                  >
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
                <p className="mt-2 mb-0 rounded-xl bg-surface px-3 py-2 text-xs text-muted">{notes[row.id]}</p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </SellerShell>
  );
}
