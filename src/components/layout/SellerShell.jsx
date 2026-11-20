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

/** UI shell styled to match the Hukum supplier redesign — same nav + APIs as before. */
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

  const company =
    vendor?.tradeName ||
    vendor?.legalName?.[lang] ||
    vendor?.legalName?.en ||
    "";

  return (
    <div className="relative flex min-h-dvh bg-bg text-text">
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "ws-sidebar fixed inset-y-0 start-0 z-50 flex h-dvh w-[min(17rem,88vw)] flex-col transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:w-[248px] lg:translate-x-0",
          open ? "translate-x-0" : "ltr:-translate-x-full rtl:translate-x-full lg:ltr:translate-x-0 lg:rtl:translate-x-0"
        )}
        aria-label="Main menu"
      >
        <div className="flex items-start justify-between gap-2 px-3 pt-5">
          <Link href="/dashboard" className="ws-brand min-w-0 flex-1" onClick={() => setOpen(false)}>
            <img
              src="/brand/hukum-calligraphy.png"
              alt="Hukum"
              width={72}
              height={44}
            />
            <p className="ws-brand__role">{lang === "ar" ? "مساحة المورد" : "Supplier workspace"}</p>
            {company ? <p className="ws-brand__company truncate">{company}</p> : null}
          </Link>
          <button
            type="button"
            className="btn-icon lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="ws-nav flex-1 overflow-y-auto px-3 py-2">
          <div className="ws-group flex flex-col gap-0.5">
            {SELLER_NAV.map((item) => {
              const Icon = item.icon;
              // Keep Products highlighted for AI catalogue / import / new / edit routes.
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className="ws-item"
                >
                  <span className="ws-item__icon">
                    <Icon size={20} strokeWidth={1.8} aria-hidden />
                  </span>
                  <span className="truncate">{lang === "ar" ? item.labelAr : item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-border px-3 py-3 text-xs text-muted">{user?.email || "—"}</div>
      </aside>

      <div className="flex min-h-dvh w-full min-w-0 flex-1 flex-col lg:ms-[248px]">
        <header className="ws-topbar flex items-center justify-between gap-3 px-4 py-2.5 md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="btn-icon lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Menu"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <p className="m-0 truncate text-[15px] font-semibold tracking-[-0.02em]">{title}</p>
              <p className="m-0 truncate text-xs text-muted">{user?.name || "Seller"}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className="ws-chip"
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            >
              {lang === "ar" ? "EN" : "عربي"}
            </button>
            <button
              type="button"
              className="ws-chip"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link
              href="/dashboard/notifications"
              className="ws-chip"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell size={18} />
              <span className="hidden sm:inline">{lang === "ar" ? "التنبيهات" : "Alerts"}</span>
              {unread > 0 ? (
                <span className="ws-chip__badge">{unread > 9 ? "9+" : unread}</span>
              ) : null}
            </Link>
            <button type="button" className="ws-chip" onClick={onLogout}>
              <LogOut size={16} />
              <span className="hidden sm:inline">{lang === "ar" ? "خروج" : "Logout"}</span>
            </button>
          </div>
        </header>

        {toast ? (
          <div className="fixed end-4 top-20 z-50 w-[min(360px,calc(100vw-2rem))] rounded-[var(--radius-lg)] border border-gold/30 bg-card p-3.5 shadow-[var(--shadow-card-hover)]">
            <p className="m-0 text-sm font-semibold text-text">{toast.title}</p>
            <p className="mt-1 mb-0 text-xs text-muted">{toast.body}</p>
            {toast.phone ? (
              <p className="mt-1 mb-0 text-xs font-medium text-gold">{toast.phone}</p>
            ) : null}
            <div className="mt-2 flex gap-2">
              <Link
                href={toast.href || "/dashboard/inquiries"}
                className="btn-primary !px-3 !py-1.5 !text-xs"
                onClick={() => setToast(null)}
              >
                Open
              </Link>
              <button
                type="button"
                className="btn-outline !px-3 !py-1.5 !text-xs"
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
