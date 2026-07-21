"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PanelLayout } from "@/components/PanelLayout";
import { api, getToken, Student, Debtor } from "@/lib/api";

const NAV = [
  { href: "/admin", label: "Главная", icon: "🏠" },
  { href: "/admin/students", label: "Ученики", icon: "👨‍🎓" },
  { href: "/admin/payments", label: "Оплаты", icon: "💰" },
  { href: "/director/staff", label: "Сотрудники", icon: "👥" },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    Promise.all([api.listStudents(), api.listDebtors()])
      .then(([s, d]) => { setStudents(s); setDebtors(d); })
      .finally(() => setLoading(false));
  }, [router]);

  const leads = students.filter(s => s.status === "lead");
  const riskStudents = students.filter(s => s.lessons_missed >= 3 && s.status === "active");

  return (
    <PanelLayout title="Администратор" navItems={NAV}>
      <div className="p-4 sm:p-8 max-w-4xl">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mb-1">Добрый день!</h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">
          {new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
        </p>

        {loading ? <p className="text-sm text-[var(--color-text-muted)]">Загрузка...</p> : (<>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Link href="/admin/students" className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 hover:border-[var(--color-accent)] transition-colors">
              <p className="text-xs text-[var(--color-text-muted)] mb-1">Новые заявки</p>
              <p className={`text-2xl font-bold ${leads.length > 0 ? "text-[var(--color-warning)]" : "text-[var(--color-text-muted)]"}`}>{leads.length}</p>
              <p className="text-xs text-[var(--color-accent)] mt-1">Открыть →</p>
            </Link>
            <Link href="/admin/payments" className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 hover:border-[var(--color-accent)] transition-colors">
              <p className="text-xs text-[var(--color-text-muted)] mb-1">Должников</p>
              <p className={`text-2xl font-bold ${debtors.length > 0 ? "text-[var(--color-danger)]" : "text-[var(--color-success)]"}`}>{debtors.length}</p>
              <p className="text-xs text-[var(--color-accent)] mt-1">Принять оплату →</p>
            </Link>
          </div>

          {leads.length > 0 && (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden mb-4">
              <div className="px-5 py-3 border-b border-[var(--color-border)] flex justify-between items-center">
                <h2 className="text-sm font-semibold">Новые заявки — позвонить</h2>
                <Link href="/admin/students" className="text-xs text-[var(--color-accent)]">Все ученики →</Link>
              </div>
              {leads.slice(0, 5).map(s => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)] last:border-0">
                  <div>
                    <p className="text-sm font-medium">{s.full_name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{s.phone} · {s.source || "источник неизвестен"}</p>
                  </div>
                  <a href={`tel:${s.phone}`} className="text-xs font-medium px-3 py-1.5 rounded-xl bg-[var(--color-accent)] text-white">
                    Позвонить
                  </a>
                </div>
              ))}
            </div>
          )}

          {debtors.length > 0 && (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden mb-4">
              <div className="px-5 py-3 border-b border-[var(--color-border)] flex justify-between items-center">
                <h2 className="text-sm font-semibold text-[var(--color-danger)]">Должники</h2>
                <Link href="/admin/payments" className="text-xs text-[var(--color-accent)]">Принять оплату →</Link>
              </div>
              {debtors.slice(0, 5).map(d => (
                <div key={d.student_id} className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)] last:border-0">
                  <div>
                    <p className="text-sm font-medium">{d.full_name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{d.phone}</p>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--color-danger-bg)] text-[var(--color-danger)]">
                    {d.days_overdue ? `${d.days_overdue} дн.` : "не платил"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {riskStudents.length > 0 && (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[var(--color-border)]">
                <h2 className="text-sm font-semibold text-[var(--color-warning)]">Часто пропускают (3+ раз)</h2>
              </div>
              {riskStudents.map(s => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)] last:border-0">
                  <div>
                    <p className="text-sm font-medium">{s.full_name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{s.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[var(--color-danger)]">{s.lessons_missed} пропусков</p>
                    {s.lessons_late > 0 && <p className="text-xs text-[var(--color-warning)]">{s.lessons_late} опозданий</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>)}
      </div>
    </PanelLayout>
  );
}
