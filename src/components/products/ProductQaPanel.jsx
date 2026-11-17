"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api-client";

/** Seller answers buyer questions on a product listing. */
export function ProductQaPanel({ productId }) {
  const [items, setItems] = useState([]);
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    if (!productId) return;
    try {
      const { json } = await apiGet(`/api/product-qa?productId=${encodeURIComponent(productId)}`);
      if (!json.success) throw new Error(json.message || "Failed to load Q&A");
      setItems(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setError(e.message || "Failed");
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function answer(id) {
    const text = String(answers[id] || "").trim();
    if (text.length < 2) {
      setError("Write a short answer first");
      return;
    }
    setBusy(id);
    setError("");
    setMsg("");
    try {
      const { json } = await apiPost("/api/product-qa", {
        action: "answer",
        id,
        answer: text,
      });
      if (!json.success) throw new Error(json.message || "Answer failed");
      setMsg("Answer published");
      setAnswers((prev) => ({ ...prev, [id]: "" }));
      await load();
    } catch (e) {
      setError(e.message || "Failed");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="mt-6 space-y-3 rounded-xl border border-border bg-card p-5">
      <h2 className="m-0 text-xs font-semibold uppercase tracking-wide text-gold">Product Q&amp;A</h2>
      <p className="m-0 text-sm text-muted">Answer buyer questions. Answers appear on the marketplace listing.</p>
      {error ? <p className="m-0 text-sm text-danger">{error}</p> : null}
      {msg ? <p className="m-0 text-sm text-gold">{msg}</p> : null}
      {items.length === 0 ? (
        <p className="m-0 text-sm text-muted">No questions yet.</p>
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0">
          {items.map((q) => (
            <li key={q._id} className="rounded-lg border border-border bg-bg p-3">
              <p className="m-0 text-sm font-semibold text-text">{q.question}</p>
              {q.answer ? (
                <p className="mt-2 mb-0 text-sm text-muted">{q.answer}</p>
              ) : (
                <div className="mt-2 space-y-2">
                  <textarea
                    className="w-full rounded-[10px] border border-border bg-card px-3 py-2 text-sm text-text"
                    rows={2}
                    value={answers[q._id] || ""}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q._id]: e.target.value }))}
                    placeholder="Write your answer…"
                  />
                  <button
                    type="button"
                    className="btn-primary !px-3 !py-1.5 text-xs"
                    disabled={busy === q._id}
                    onClick={() => void answer(q._id)}
                  >
                    {busy === q._id ? "Saving…" : "Publish answer"}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
