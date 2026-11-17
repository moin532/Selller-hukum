"use client";

import { useMemo, useState } from "react";
import { Copy, Check, QrCode, Share2 } from "lucide-react";

export function ShareKit({ publicUrl, companyName }) {
  const [copied, setCopied] = useState(false);
  const qrSrc = useMemo(() => {
    if (!publicUrl) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(publicUrl)}`;
  }, [publicUrl]);

  if (!publicUrl) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted">
        Publish an approved storefront to unlock your share kit and QR code.
      </div>
    );
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const wa = `https://wa.me/?text=${encodeURIComponent(`${companyName || "Our storefront"} — ${publicUrl}`)}`;
  const mail = `mailto:?subject=${encodeURIComponent(companyName || "Supplier storefront")}&body=${encodeURIComponent(publicUrl)}`;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Share2 className="h-4 w-4 text-gold" />
        <h3 className="m-0 text-sm font-semibold text-text">Share kit</h3>
      </div>
      <p className="m-0 mb-3 break-all text-xs text-muted">{publicUrl}</p>
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy link"}
        </button>
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-lg border border-border px-3 py-1.5 text-xs font-semibold"
        >
          WhatsApp
        </a>
        <a href={mail} className="inline-flex items-center rounded-lg border border-border px-3 py-1.5 text-xs font-semibold">
          Email
        </a>
      </div>
      {qrSrc ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrSrc} alt="Storefront QR" width={120} height={120} className="rounded-lg border border-border bg-white p-1" />
          <div className="text-xs text-muted">
            <p className="m-0 mb-1 inline-flex items-center gap-1 font-semibold text-text">
              <QrCode className="h-3.5 w-3.5" /> QR code
            </p>
            <p className="m-0">Print on cards, booths, and invoices so buyers open your microsite instantly.</p>
            <a href={qrSrc} download="storefront-qr.png" className="mt-2 inline-flex text-gold underline">
              Download QR
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
