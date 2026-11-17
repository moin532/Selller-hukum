"use client";

import { useEffect, useMemo, useState } from "react";
import { SellerShell } from "@/components/layout/SellerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiGet, apiPost } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

export default function SellerProductQaPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("open");
  const [answers, setAnswers] = useState({});
  const [busyId, setBusyId] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const q = filter === "all" ? "mine=1" : `mine=1&status=${encodeURIComponent(filter)}`;
      const { json } = await apiGet(`/api/product-qa?${q}`);
      if (!json?.success) throw new Error(json?.message || "Failed to load");
      setItems(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setItems([]);
      setError(e.message || "Failed to load questions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const openCount = useMemo(() => items.filter((i) => i.status === "open").length, [items]);

  async function submitAnswer(id) {
    const answer = String(answers[id] || "").trim();
    if (answer.length < 2) {
      setError("Answer must be at least 2 characters");
      return;
    }
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      const { json } = await apiPost("/api/product-qa", { action: "answer", id, answer });
      if (!json?.success) throw new Error(json?.message || "Failed to answer");
      setMessage("Answer posted");
      setAnswers((prev) => ({ ...prev, [id]: "" }));
      await load();
    } catch (e) {
      setError(e.message || "Failed to answer");
    } finally {
      setBusyId("");
    }
  }

  return (
    <SellerShell title="Product Q&A">
      <PageHeader
        title="Product Q&A"
        subtitle="Answer buyer questions on your product pages."
        actions={
          <div className="flex gap-2">
            {["open", "answered", "all"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  filter === f ? "bg-[#c9a962] text-white" : "border border-[#e6e2da] bg-white"
                }`}
              >
                {f === "open" ? `Open${openCount && filter === "open" ? ` (${openCount})` : ""}` : f === "answered" ? "Answered" : "All"}
              </button>
            ))}
          </div>
        }
      />

      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      {message ? <p className="mb-3 text-sm text-emerald-700">{message}</p> : null}

      {loading ? (
        <p className="text-sm text-[#6b6b6b]">Loading…</p>
      ) : items.length === 0 ? (
        <EmptyState title="No questions" description="Buyers can ask from your product pages on hukum-ksa.com." />
      ) : (
        <ul className="space-y-3">
          {items.map((row) => (
            <li key={String(row._id)} className="rounded-xl border border-[#e6e2da] bg-white p-4">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-[#8a8a8a]">
                <span className="rounded bg-[#f5f2ec] px-1.5 py-0.5 font-medium uppercase tracking-wide text-[#5c5c5c]">
                  {row.status || "open"}
                </span>
                <span>{formatDate(row.createdAt)}</span>
                {row.productId ? <span>Product: {String(row.productId)}</span> : null}
              </div>
              <p className="m-0 text-sm font-semibold text-[#1a1612]">{row.question}</p>
              {row.answer ? (
                <p className="mt-2 mb-0 text-sm text-[#4a4a4a]">{row.answer}</p>
              ) : (
                <div className="mt-3 space-y-2">
                  <textarea
                    rows={2}
                    className="w-full rounded-md border border-[#e6e2da] px-2.5 py-2 text-sm"
                    placeholder="Write your answer…"
                    value={answers[row._id] || ""}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [row._id]: e.target.value }))}
                  />
                  <button
                    type="button"
                    disabled={busyId === String(row._id)}
                    onClick={() => submitAnswer(String(row._id))}
                    className="rounded-lg bg-[#c9a962] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {busyId === String(row._id) ? "Saving…" : "Post answer"}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </SellerShell>
  );
}
