"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { api, getToken, ScheduleOverviewItem } from "@/lib/api";

const WEEKDAY_ORDER = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export default function SchedulePage() {
  const router = useRouter();
  const [overview, setOverview] = useState<ScheduleOverviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    api.getScheduleOverview().then(setOverview).finally(() => setLoading(false));
  }, [router]);

  const byDay = WEEKDAY_ORDER.map((day) => ({
    day,
    slots: overview
      .filter((s) => s.weekday === day)
      .sort((a, b) => a.start_time.localeCompare(b.start_time)),
  })).filter((d) => d.slots.length > 0);

  return (
    <div className="flex flex-col sm:flex-row">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-8 max-w-6xl pb-24 sm:pb-8">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mb-1">Расписание и аудитории</h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-8">
          Кто где преподаёт, во сколько и сколько мест ещё свободно
        </p>

        {loading ? (
          <p className="text-sm text-[var(--color-text-muted)]">Загрузка...</p>
        ) : overview.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-6">
            {byDay.map(({ day, slots }) => (
              <div key={day} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
                <div className="px-4 sm:px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
                  <h2 className="text-sm font-semibold">{day}</h2>
                </div>

                {/* Mobile: stacked cards — easier to scan one-handed than a cramped table */}
                <div className="sm:hidden divide-y divide-[var(--color-border)]">
                  {slots.map((slot, i) => (
                    <div key={i} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">
                          {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                        </span>
                        <CapacityBadge enrolled={slot.enrolled_count} free={slot.free_slots} isFull={slot.is_full} />
                      </div>
                      <p className="text-sm">{slot.group_name}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{slot.room_name}</p>
                    </div>
                  ))}
                </div>

                {/* Desktop: table */}
                <table className="hidden sm:table w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                      <th className="px-5 py-2 font-medium">Время</th>
                      <th className="px-5 py-2 font-medium">Аудитория</th>
                      <th className="px-5 py-2 font-medium">Группа</th>
                      <th className="px-5 py-2 font-medium text-right">Заполненность</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map((slot, i) => (
                      <tr key={i} className="border-b border-[var(--color-border)] last:border-0">
                        <td className="px-5 py-3 whitespace-nowrap font-medium">
                          {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                        </td>
                        <td className="px-5 py-3 text-[var(--color-text-muted)]">{slot.room_name}</td>
                        <td className="px-5 py-3">{slot.group_name}</td>
                        <td className="px-5 py-3 text-right">
                          <CapacityBadge enrolled={slot.enrolled_count} free={slot.free_slots} isFull={slot.is_full} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function CapacityBadge({ enrolled, free, isFull }: { enrolled: number; free: number; isFull: boolean }) {
  if (isFull) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-danger-bg)] text-[var(--color-danger)] text-xs font-medium px-2.5 py-1">
        Мест нет · {enrolled}
      </span>
    );
  }
  if (free <= 2) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-warning-bg)] text-[var(--color-warning)] text-xs font-medium px-2.5 py-1">
        {free} {pluralizeSlots(free)} свободно
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)] text-xs font-medium px-2.5 py-1">
      {free} {pluralizeSlots(free)} свободно
    </span>
  );
}

function pluralizeSlots(n: number): string {
  if (n === 1) return "место";
  if (n >= 2 && n <= 4) return "места";
  return "мест";
}

function EmptyState() {
  return (
    <div className="bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] rounded-xl p-10 text-center">
      <p className="text-sm text-[var(--color-text-muted)]">
        Пока нет ни одной группы с расписанием. Создайте группу и укажите аудиторию + время.
      </p>
    </div>
  );
}
