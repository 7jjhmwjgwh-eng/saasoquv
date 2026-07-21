"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PanelLayout } from "@/components/PanelLayout";
import { api, getToken, Student, Debtor, Payment } from "@/lib/api";

const NAV = [
  { href: "/director", label: "Обзор", icon: "📊" },
  { href: "/director/staff", label: "Сотрудники", icon: "👥" },
  { href: "/director/payments", label: "Финансы", icon: "💰" },
  { href: "/director/reports", label: "Отчёты", icon: "📈" },
];

export default function DirectorDashboard() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    const role = localStorage.getItem("user_role");
    if (role !== "owner") { router.push("/login"); return; }
    Promise.all([api.listStudents(), api.listDebtors(), api.listPayments()])
      .then(([s, d, p]) => { setStudents(s); setDebtors(d); setPayments(p); })
      .finally(() => setLoading(false));
  }, [router]);

  const today = new Date().toISOString().slice(0, 7);
  const monthRevenue = payments
    .filter((p) => p.paid_at.startsWith(today))
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const active = students.filter((s) => s.status === "active").length;
  const leads = students.filter((s) => s.status === "lead").length;

  // Missed 3+ lessons in a row — attention needed
  const atRisk = students.filter((s) => s.lessons_missed >= 3).length;

  return (
    <PanelLayout title="Директор" navItems={NAV} mobileTabItems={NAV.slice(0, 4)}>
      <div className="p-4 sm:p-8 max-w-5xl">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mb-1">Обзор центра</h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">
          {new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
        </p>

        {loading ? (
          <p className="text-sm text-[var(--color-text-muted)]">Загрузка...</p>
        ) : (
          <>
            {/* Revenue highlight */}
            <div className="bg-[var(--color-accent)] rounded-2xl p-5 text-white mb-4">
              <p className="text-sm opacity-80 mb-1">Выручка за этот месяц</p>
              <p className="text-3xl font-bold">{monthRevenue.toLocaleString("ru-RU")} сум</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <StatCard label="Активных учеников" value={active} color="success" />
              <StatCard label="Новые заявки" value={leads} color="warning" />
              <StatCard label="Должников" value={debtors.length} color={debtors.length > 0 ? "danger" : "success"} />
              <StatCard label="Под угрозой отчисления" value={atRisk} color={atRisk > 0 ? "warning" : "success"} />
            </div>

            {debtors.length > 0 && (
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden mb-4">
                <div className="px-5 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Должники</h2>
                  <span className="text-xs text-[var(--color-danger)] font-medium">{debtors.length} чел.</span>
                </div>
                {debtors.slice(0, 5).map((d) => (
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
          </>
        )}
      </div>
    </PanelLayout>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    success: "text-[var(--color-success)]",
    warning: "text-[var(--color-warning)]",
    danger: "text-[var(--color-danger)]",
  };
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4">
      <p className="text-xs text-[var(--color-text-muted)] mb-2 leading-tight">{label}</p>
      <p className={`text-2xl font-bold ${colors[color] ?? ""}`}>{value}</p>
    </div>
  );
}
