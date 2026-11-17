"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut, Menu, Moon, Sun, X } from "lucide-react";
import { SELLER_NAV } from "@/lib/nav";
import { getSellerUser } from "@/lib/session";
import { logoutSeller } from "@/services/auth-api";
import { fetchMyVendor } from "@/services/company-api";
import { useTheme } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/utils";
import { VerificationWaitingBanner } from "@/components/ui/VerificationWaitingBanner";
import { apiGet } from "@/lib/api-client";
import { playNotifySound } from "@/lib/notify-sound";

export function SellerShell({ title, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme, lang, setLang } = useTheme();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [unread, setUnread] = useState(0);
  const [toast, setToast] = useState(null);
  const lastLatestId = useRef("");
  const primed = useRef(false);

  useEffect(() => {
    const u = getSellerUser();
    if (!u?.id) {
      router.replace("/login");
      return;
    }
    setUser(u);
    fetchMyVendor()
      .then((v) => {
        setVendor(v);
        const repaired = getSellerUser();
        if (repaired) setUser(repaired);
      })
      .catch(() => {
        setVendor(null);
        if (!u.vendorId) router.replace("/login");
      });
  }, [router, pathname]);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const { json } = await apiGet("/api/messages?resource=notification_summary");
        if (cancelled || !json?.success || !json.data) return;
        const data = json.data;
        const nextUnread = Number(data.unread || 0);
        const latestId = data.latestId || "";
        setUnread(nextUnread);
        if (primed.current && latestId && latestId !== lastLatestId.current && nextUnread > 0) {
          playNotifySound();
          const titleText = data.latest?.title?.en || data.latest?.type || "New notification";
          const body = data.latest?.body?.en || "";
          const phone = data.latest?.meta?.phone || "";
          setToast({
            title: titleText,
            body,
            phone,
            href: data.latest?.meta?.href || "/dashboard/notifications",
          });
          window.setTimeout(() => setToast(null), 8000);
        }
        if (latestId) lastLatestId.current = latestId;
        primed.current = true;
      } catch {
        /* ignore poll errors */
      }
    }
    poll();
    const id = window.setInterval(poll, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  async function onLogout() {
    await logoutSeller();
    router.replace("/login");
  }

  return (
    <div className="relative flex min-h-dvh bg-bg text-text">
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[#101719]/40 lg:hidden"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 start-0 z-50 flex h-dvh w-[min(18rem,92vw)] flex-col border-e border-border bg-sidebar shadow-[0_24px_60px_-28px_rgba(16,37,28,0.28)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:w-[240px] lg:translate-x-0 lg:shadow-none",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <img
              src="/brand/hukum-logo.png"
              alt="Hukum"
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 rounded-xl object-contain"
            />
            <div className="min-w-0">
              <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold">
                Hukum
              </p>
              <p className="m-0 truncate text-sm font-semibold tracking-[-0.02em]">
                {lang === "ar" ? "لوحة البائع" : "Seller Admin"}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SELLER_NAV.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "mb-0.5 flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-gold-muted text-gold"
                    : "text-muted hover:bg-[#17232b]/[0.035] hover:text-text"
                )}
              >
                <Icon size={16} className="shrink-0" />
                <span className="truncate">{lang === "ar" ? item.labelAr : item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3 text-xs text-muted">{user?.email || "—"}</div>
      </aside>

      <div className="flex min-h-dvh w-full min-w-0 flex-1 flex-col lg:ms-[240px]">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur-md md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Menu"
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0">
              <p className="m-0 truncate text-[15px] font-semibold tracking-[-0.02em]">{title}</p>
              <p className="m-0 truncate text-xs text-muted">{user?.name || "Seller"}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-full border border-border px-3 text-xs font-semibold text-text"
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            >
              {lang === "ar" ? "EN" : "عربي"}
            </button>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Link
              href="/dashboard/notifications"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface transition hover:border-gold/40 hover:text-gold"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell size={16} />
              {unread > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </Link>
            <button
              type="button"
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold"
              onClick={onLogout}
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {toast ? (
          <div className="fixed right-4 top-20 z-50 w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-gold/30 bg-card p-3.5 shadow-[0_18px_40px_-20px_rgba(16,37,28,0.35)]">
            <p className="m-0 text-sm font-semibold text-text">{toast.title}</p>
            <p className="mt-1 mb-0 text-xs text-muted">{toast.body}</p>
            {toast.phone ? (
              <p className="mt-1 mb-0 text-xs font-medium text-gold">{toast.phone}</p>
            ) : null}
            <div className="mt-2 flex gap-2">
              <Link
                href={toast.href || "/dashboard/inquiries"}
                className="rounded-full bg-gold px-3 py-1.5 text-xs font-semibold text-white"
                onClick={() => setToast(null)}
              >
                Open
              </Link>
              <button
                type="button"
                className="rounded-full border border-border px-3 py-1.5 text-xs text-muted"
                onClick={() => setToast(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        <main className="relative z-0 flex-1 px-4 py-6 md:px-6 lg:px-8">
          <VerificationWaitingBanner vendor={vendor} lang={lang} />
          {children}
        </main>
      </div>
    </div>
  );
}
