"use client";

import { useEffect } from "react";

/** Recover from stale Next.js chunks after redeploys (common "Application error" cause). */
export default function AppError({ error, reset }) {
  useEffect(() => {
    const msg = String(error?.message || error || "");
    const chunkMiss =
      /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
        msg
      );
    if (!chunkMiss || typeof window === "undefined") return;
    const key = "kt_seller_chunk_reload";
    if (sessionStorage.getItem(key) === "1") return;
    sessionStorage.setItem(key, "1");
    window.location.reload();
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="m-0 text-xl font-semibold text-text">Something went wrong</h1>
      <p className="m-0 text-sm text-muted">
        {String(error?.message || "A client error occurred. Try refreshing the page.")}
      </p>
      <button type="button" className="btn-primary" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
