"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PanelLayout } from "@/components/PanelLayout";
import { api, getToken, Group } from "@/lib/api";

const NAV = [
  { href: "/teacher", label: "Главная", icon: "🏠" },
  { href: "/teacher/attendance", label: "Посещаемость", icon: "✅" },
  { href: "/teacher/homework", label: "ДЗ", icon: "📝" },
];

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export default function TeacherDashboard() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    api.listGroups().then(setGroups).finally(() => setLoading(false));
  }, [router]);

  // Today's weekday (0=Mon ... 6=Sun)
  const todayWd = (new Date().getDay() + 6) % 7;
  const todayGroups = groups.filter(g =>
    g.schedule_slots.some(s => s.weekday === todayWd)
  );

  const userName = typeof window !== "undefined" ? localStorage.getItem("user_name") ?? "" : "";

  return (
    <PanelLayout title="Учитель" navItems={NAV}>
      <div className="p-4 sm:p-8 max-w-2xl">
        <h1 className="text-xl font-semibold mb-1">Привет, {userName}! 👋</h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">
          Сегодня {new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
        </p>

        {loading ? <p className="text-sm text-[var(--color-text-muted)]">Загрузка...</p> : (<>

          <h2 className="text-sm font-semibold mb-3">Мои занятия сегодня</h2>
          {todayGroups.length === 0 ? (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-8 text-center mb-6">
              <p className="text-2xl mb-2">🎉</p>
              <p className="text-sm text-[var(--color-text-muted)]">Сегодня занятий нет</p>
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {todayGroups.map(g => {
                const todaySlots = g.schedule_slots.filter(s => s.weekday === todayWd);
                return (
                  <div key={g.id} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{g.name}</p>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${g.is_full ? "bg-[var(--color-danger-bg)] text-[var(--color-danger)]" : "bg-[var(--color-success-bg)] text-[var(--color-success)]"}`}>
                        {g.enrolled_count} уч.
                      </span>
                    </div>
                    {todaySlots.map(s => (
                      <p key={s.id} className="text-sm text-[var(--color-text-muted)]">
                        🕐 {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                      </p>
                    ))}
                    <Link href={`/teacher/attendance?group=${g.id}`}
                      className="mt-3 inline-block rounded-xl bg-[var(--color-accent)] text-white text-xs font-semibold px-4 py-2 hover:bg-[var(--color-accent-hover)] transition-colors">
                      Отметить посещаемость
                    </Link>
                  </div>
                );
              })}
            </div>
          )}

          <h2 className="text-sm font-semibold mb-3">Все мои группы</h2>
          <div className="space-y-2">
            {groups.map(g => (
              <div key={g.id} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{g.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {g.schedule_slots.slice().sort((a, b) => a.weekday - b.weekday).map(s => WEEKDAYS[s.weekday]).join(" / ")}
                    {g.schedule_slots[0] && ` · ${g.schedule_slots[0].start_time.slice(0, 5)}`}
                  </p>
                </div>
                <span className="text-xs text-[var(--color-text-muted)]">{g.enrolled_count}/{g.max_students}</span>
              </div>
            ))}
          </div>
        </>)}
      </div>
    </PanelLayout>
  );
}
