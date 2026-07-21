"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Обзор", icon: "▤" },
  { href: "/schedule", label: "Расписание", icon: "▦" },
  { href: "/attendance", label: "Посещаемость", icon: "☑" },
  { href: "/groups", label: "Группы", icon: "◫" },
  { href: "/students", label: "Ученики", icon: "◍" },
  { href: "/payments", label: "Оплаты", icon: "₴" },
  { href: "/courses", label: "Курсы и уровни", icon: "▥" },
  { href: "/rooms", label: "Аудитории", icon: "▧" },
];

// The 4 most-used sections on a phone, for the bottom tab bar. Keeping this
// short (not all 7 nav items) is what makes it usable with one thumb.
const MOBILE_TAB_ITEMS = [
  { href: "/dashboard", label: "Обзор", icon: "▤" },
  { href: "/attendance", label: "Посещ.", icon: "☑" },
  { href: "/payments", label: "Оплаты", icon: "₴" },
  { href: "/students", label: "Ученики", icon: "◍" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function handleLogout() {
    localStorage.removeItem("access_token");
    router.push("/login");
  }

  return (
    <>
      {/* Mobile top bar — replaces the desktop sidebar header on small screens */}
      <header className="sm:hidden sticky top-0 z-30 flex items-center justify-between bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 py-3">
        <span className="text-base font-semibold tracking-tight">EduCRM</span>
        <button
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Открыть меню"
          className="p-1.5 -mr-1.5 text-[var(--color-text-muted)]"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      {/* Mobile full-screen menu overlay — covers everything else in NAV_ITEMS
          beyond the 4 bottom-tab shortcuts */}
      {mobileMenuOpen && (
        <div className="sm:hidden fixed inset-0 z-40 bg-[var(--color-bg)]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
            <span className="text-base font-semibold tracking-tight">Меню</span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Закрыть меню"
              className="p-1.5 -mr-1.5 text-[var(--color-text-muted)]"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <nav className="p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-colors ${
                    active
                      ? "bg-[var(--color-accent)] text-white"
                      : "text-[var(--color-text)] hover:bg-[var(--color-surface)]"
                  }`}
                >
                  <span className="text-lg leading-none">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-[var(--color-danger)] hover:bg-[var(--color-surface)] transition-colors"
            >
              <span className="text-lg leading-none">⏻</span>
              Выйти
            </button>
          </nav>
        </div>
      )}

      {/* Mobile bottom tab bar — the primary navigation on small screens */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 flex bg-[var(--color-surface)] border-t border-[var(--color-border)] pb-[env(safe-area-inset-bottom)]">
        {MOBILE_TAB_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
                active ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]"
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Desktop sidebar — unchanged from before, hidden on small screens */}
      <aside className="hidden sm:flex w-60 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex-col h-screen sticky top-0">
        <div className="px-5 py-5 border-b border-[var(--color-border)]">
          <span className="text-lg font-semibold tracking-tight">EduCRM</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[var(--color-accent)] text-white"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]"
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-[var(--color-border)]">
          <button
            onClick={handleLogout}
            className="w-full text-left rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-danger)] transition-colors"
          >
            Выйти
          </button>
        </div>
      </aside>
    </>
  );
}
