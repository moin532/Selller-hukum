"use client";

import { useCallback, useEffect, useState } from "react";
import { SellerShell } from "@/components/layout/SellerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { apiGet, apiPatch, apiPost } from "@/lib/api-client";

/**
 * Hukum chat & inbox (seller) — same Conversation API as buyer:
 * buyer–supplier threads, support SLA, WhatsApp sync flags, translate, report.
 */
export default function SellerInboxPage() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [activeMeta, setActiveMeta] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [text, setText] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showTranslation, setShowTranslation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [typing, setTyping] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const q = filterType ? `?threadType=${encodeURIComponent(filterType)}` : "";
      const [conv, rem] = await Promise.all([
        apiGet(`/api/messages${q}`),
        apiGet("/api/quotations?resource=reminders&locale=en"),
      ]);
      if (!conv.json.success) throw new Error(conv.json.message || "Inbox failed");
      if (!rem.json.success) throw new Error(rem.json.message || "Reminders failed");
      setConversations(Array.isArray(conv.json.data) ? conv.json.data : []);
      setReminders(Array.isArray(rem.json.data?.reminders) ? rem.json.data.reminders : []);
    } catch (e) {
      setError(e.message || "Load failed");
    }
  }, [filterType]);

  useEffect(() => {
    load();
  }, [load]);

  async function loadThread(id) {
    if (!id) return;
    const { json } = await apiGet(`/api/messages?conversationId=${encodeURIComponent(id)}`);
    if (!json.success) throw new Error(json.message || "Thread failed");
    setMessages(Array.isArray(json.data?.messages) ? json.data.messages : []);
    setActiveMeta(json.data?.conversation || null);
    setTyping(Array.isArray(json.data?.typing) && json.data.typing.length > 0);
  }

  useEffect(() => {
    if (activeId) loadThread(activeId).catch((e) => setError(e.message));
  }, [activeId]);

  async function send(e) {
    e.preventDefault();
    if (!activeId || !text.trim()) return;
    setBusy(true);
    setError("");
    try {
      const { json } = await apiPost("/api/messages", {
        action: "send",
        conversationId: activeId,
        body: text.trim(),
        translateTo: showTranslation ? "ar" : undefined,
        syncWhatsApp: Boolean(activeMeta?.whatsapp?.linkedPhone && !activeMeta?.whatsapp?.optOut),
      });
      if (!json.success) throw new Error(json.message || "Send failed");
      setText("");
      await loadThread(activeId);
      await load();
    } catch (err) {
      setError(err.message || "Send failed");
    } finally {
      setBusy(false);
    }
  }

  async function onTyping() {
    if (!activeId) return;
    try {
      await apiPatch("/api/messages", { action: "typing", conversationId: activeId });
    } catch {
      /* ignore */
    }
  }

  async function report() {
    if (!activeId) return;
    const reason = window.prompt("Report reason?") || "abuse";
    setBusy(true);
    try {
      const { json } = await apiPost("/api/messages", {
        action: "report",
        conversationId: activeId,
        reason,
      });
      if (!json.success) throw new Error(json.message || "Report failed");
      alert("Report submitted.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SellerShell title="Inbox">
      <PageHeader
        title="Hukum inbox"
        subtitle="One inbox — buyer threads, quote cards, WhatsApp sync, contact gate, support SLA. Same conversation on web & mobile."
      />
      {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}

      {reminders.length > 0 ? (
        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {reminders.slice(0, 3).map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-3 text-sm">
              <p className="m-0 text-[10px] uppercase text-muted">{r.type}</p>
              <p className="mt-1 mb-0 font-semibold">{r.title}</p>
              <p className="mt-1 mb-0 text-xs text-muted">{r.body}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mb-3 flex flex-wrap gap-1">
        {[
          ["", "All"],
          ["buyer_supplier", "Buyer threads"],
          ["support", "Support"],
          ["ai_assistant", "AI"],
        ].map(([id, label]) => (
          <button
            key={id || "all"}
            type="button"
            onClick={() => setFilterType(id)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              filterType === id ? "border-gold bg-gold/15" : "border-border text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-xl border border-border bg-card">
          <ul className="m-0 max-h-[480px] list-none overflow-y-auto p-0">
            {conversations.length === 0 ? (
              <li className="p-4 text-sm text-muted">No threads yet.</li>
            ) : (
              conversations.map((c) => (
                <li key={String(c._id)}>
                  <button
                    type="button"
                    className={`w-full border-b border-border px-3 py-3 text-start ${
                      activeId === String(c._id) ? "bg-gold/10" : ""
                    }`}
                    onClick={() => setActiveId(String(c._id))}
                  >
                    <p className="m-0 truncate text-sm font-medium">{c.subject || c.threadType || "Thread"}</p>
                    <p className="m-0 mt-0.5 truncate text-[11px] text-muted">
                      {c.lastMessagePreview || ""}
                    </p>
                    <p className="m-0 mt-1 text-[10px] uppercase text-gold">
                      {(c.threadType || "buyer_supplier").replace(/_/g, " ")}
                      {c.whatsapp?.linkedPhone ? " · WA" : ""}
                    </p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </aside>

        <section className="flex min-h-[420px] flex-col overflow-hidden rounded-xl border border-border bg-card">
          {!activeId ? (
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted">
              Select a conversation
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
                <div>
                  <p className="m-0 text-sm font-semibold">{activeMeta?.subject || "Thread"}</p>
                  {typing ? <p className="m-0 text-[11px] text-gold">Buyer typing…</p> : null}
                  {activeMeta?.sla?.dueAt ? (
                    <p className="m-0 text-[11px] text-muted">
                      SLA due {new Date(activeMeta.sla.dueAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="btn-outline text-xs"
                    onClick={() => setShowTranslation((v) => !v)}
                  >
                    {showTranslation ? "Translate ON" : "AR ↔ EN"}
                  </button>
                  <button type="button" className="btn-outline text-xs text-danger" disabled={busy} onClick={report}>
                    Report
                  </button>
                </div>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto bg-muted/10 p-3">
                {messages.map((m) => (
                  <div key={String(m._id)} className="rounded-xl border border-border bg-card px-3 py-2 text-sm">
                    {m.channel === "whatsapp" ? (
                      <p className="m-0 mb-1 text-[10px] font-bold text-[#25D366]">WhatsApp</p>
                    ) : null}
                    <p className="m-0 whitespace-pre-wrap">{m.body}</p>
                    {showTranslation && m.bodyTranslated ? (
                      <p className="m-0 mt-1 border-t border-border pt-1 text-xs text-muted">{m.bodyTranslated}</p>
                    ) : null}
                    <p className="m-0 mt-1 text-[10px] text-muted">
                      {m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}
                      {Array.isArray(m.readBy) && m.readBy.length > 1 ? " · Read" : ""}
                    </p>
                  </div>
                ))}
              </div>
              <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
                <input
                  className="input-field flex-1"
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    void onTyping();
                  }}
                  placeholder="Type a message…"
                  disabled={busy}
                />
                <button type="submit" className="btn-primary" disabled={busy || !text.trim()}>
                  Send
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </SellerShell>
  );
}
