"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface PanelLayoutProps {
  title: string;
  subtitle?: string;
  navItems: NavItem[];
  mobileTabItems?: NavItem[];
  accentColor?: string;
  children: React.ReactNode;
}

export function PanelLayout({
  title,
  subtitle,
  navItems,
  mobileTabItems,
  children,
}: PanelLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const userName = typeof window !== "undefined" ? localStorage.getItem("user_name") ?? "" : "";

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_role");
    localStorage.removeItem("user_name");
    router.push("/login");
  }

  const mobileNav = mobileTabItems ?? navItems.slice(0, 4);

  return (
    <>
      {/* Mobile top bar */}
      <header className="sm:hidden sticky top-0 z-30 flex items-center justify-between bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 py-3">
        <div>
          <span className="text-base font-semibold">{title}</span>
          {subtitle && <span className="ml-2 text-xs text-[var(--color-text-muted)]">{subtitle}</span>}
        </div>
        <button onClick={() => setMenuOpen(true)} className="p-1.5 text-[var(--color-text-muted)]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      {/* Mobile full menu */}
      {menuOpen && (
        <div className="sm:hidden fixed inset-0 z-40 bg-[var(--color-bg)]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
            <div>
              <p className="font-semibold">{title}</p>
              {userName && <p className="text-xs text-[var(--color-text-muted)]">{userName}</p>}
            </div>
            <button onClick={() => setMenuOpen(false)} className="p-1.5 text-[var(--color-text-muted)]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-colors ${
                    active ? "bg-[var(--color-accent)] text-white" : "text-[var(--color-text)] hover:bg-[var(--color-surface)]"
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium text-[var(--color-danger)] hover:bg-[var(--color-surface)]"
            >
              <span className="text-xl">⏻</span>
              Выйти
            </button>
          </nav>
        </div>
      )}

      {/* Mobile bottom tabs */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 flex bg-[var(--color-surface)] border-t border-[var(--color-border)] pb-[env(safe-area-inset-bottom)]">
        {mobileNav.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
                active ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Desktop layout */}
      <div className="flex">
        <aside className="hidden sm:flex w-60 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex-col h-screen sticky top-0">
          <div className="px-5 py-5 border-b border-[var(--color-border)]">
            <p className="text-base font-semibold">{title}</p>
            {userName && <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{userName}</p>}
            {subtitle && <p className="text-xs text-[var(--color-text-muted)]">{subtitle}</p>}
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    active ? "bg-[var(--color-accent)] text-white" : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]"
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="px-3 py-4 border-t border-[var(--color-border)]">
            <button
              onClick={handleLogout}
              className="w-full text-left rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-danger)] transition-colors"
            >
              ⏻ Выйти
            </button>
          </div>
        </aside>

        <main className="flex-1 min-h-screen pb-20 sm:pb-0">{children}</main>
      </div>
    </>
  );
}
