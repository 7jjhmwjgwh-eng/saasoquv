"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PanelLayout } from "@/components/PanelLayout";
import { api, getToken, Group, Student } from "@/lib/api";

const NAV = [
  { href: "/director", label: "Обзор", icon: "📊" },
  { href: "/director/staff", label: "Сотрудники", icon: "👥" },
  { href: "/director/payments", label: "Финансы", icon: "💰" },
  { href: "/director/reports", label: "Отчёты", icon: "📈" },
];

export default function DirectorReports() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    Promise.all([api.listStudents(), api.listGroups()])
      .then(([s, g]) => { setStudents(s); setGroups(g); })
      .finally(() => setLoading(false));
  }, [router]);

  const statuses = [
    { key: "active", label: "Активных", color: "success" },
    { key: "lead", label: "Лидов", color: "warning" },
    { key: "trial", label: "Пробных", color: "warning" },
    { key: "dropped", label: "Отчисленных", color: "danger" },
  ];

  const sources = students.reduce((acc: Record<string, number>, s) => {
    const src = s.source || "Не указан";
    acc[src] = (acc[src] || 0) + 1;
    return acc;
  }, {});

  const riskStudents = students.filter(s => s.lessons_missed >= 3 && s.status === "active");

  return (
    <PanelLayout title="Директор" navItems={NAV}>
      <div className="p-4 sm:p-8 max-w-4xl">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mb-6">Отчёты</h1>

        {loading ? <p className="text-sm text-[var(--color-text-muted)]">Загрузка...</p> : (<>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {statuses.map(st => {
              const count = students.filter(s => s.status === st.key).length;
              const colors: Record<string, string> = { success: "text-[var(--color-success)]", warning: "text-[var(--color-warning)]", danger: "text-[var(--color-danger)]" };
              return (
                <div key={st.key} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4">
                  <p className="text-xs text-[var(--color-text-muted)] mb-1">{st.label}</p>
                  <p className={`text-2xl font-bold ${colors[st.color]}`}>{count}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
              <h2 className="text-sm font-semibold mb-3">Загрузка групп</h2>
              <div className="space-y-3">
                {groups.map(g => {
                  const pct = g.max_students > 0 ? Math.round((g.enrolled_count / g.max_students) * 100) : 0;
                  return (
                    <div key={g.id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="truncate max-w-[60%]">{g.name}</span>
                        <span className="text-[var(--color-text-muted)]">{g.enrolled_count}/{g.max_students}</span>
                      </div>
                      <div className="h-1.5 bg-[var(--color-bg)] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pct >= 90 ? "bg-[var(--color-danger)]" : pct >= 70 ? "bg-[var(--color-warning)]" : "bg-[var(--color-success)]"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
              <h2 className="text-sm font-semibold mb-3">Источники учеников</h2>
              <div className="space-y-2">
                {Object.entries(sources).sort((a, b) => b[1] - a[1]).map(([src, count]) => (
                  <div key={src} className="flex items-center justify-between">
                    <span className="text-sm">{src}</span>
                    <span className="text-sm font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {riskStudents.length > 0 && (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[var(--color-border)]">
                <h2 className="text-sm font-semibold text-[var(--color-warning)]">⚠️ Под угрозой отчисления (3+ пропусков)</h2>
              </div>
              {riskStudents.map(s => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)] last:border-0">
                  <div>
                    <p className="text-sm font-medium">{s.full_name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{s.phone}</p>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--color-warning-bg)] text-[var(--color-warning)]">
                    {s.lessons_missed} пропусков
                  </span>
                </div>
              ))}
            </div>
          )}
        </>)}
      </div>
    </PanelLayout>
  );
}
