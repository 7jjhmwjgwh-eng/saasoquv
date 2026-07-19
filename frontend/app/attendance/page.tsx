"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { api, getToken, Group, GroupStudent } from "@/lib/api";

type StatusValue = "present" | "absent" | "late" | "excused";

const STATUS_OPTIONS: { value: StatusValue; label: string; shortLabel: string }[] = [
  { value: "present", label: "Был", shortLabel: "✓" },
  { value: "absent", label: "Нет", shortLabel: "✕" },
  { value: "late", label: "Опоздал", shortLabel: "⏰" },
  { value: "excused", label: "Уваж.", shortLabel: "🟡" },
];

const STATUS_STYLES: Record<StatusValue, string> = {
  present: "bg-[var(--color-success)] text-white border-[var(--color-success)]",
  absent: "bg-[var(--color-danger)] text-white border-[var(--color-danger)]",
  late: "bg-[var(--color-warning)] text-white border-[var(--color-warning)]",
  excused: "bg-[var(--color-text-muted)] text-white border-[var(--color-text-muted)]",
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AttendancePage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [students, setStudents] = useState<GroupStudent[]>([]);
  const [statuses, setStatuses] = useState<Record<string, StatusValue>>({});
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    api
      .listGroups()
      .then((g) => {
        setGroups(g);
        if (g.length > 0) setSelectedGroupId(g[0].id);
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!selectedGroupId) return;
    setLoadingRoster(true);
    setSaved(false);
    setError(null);

    Promise.all([
      api.getGroupStudents(selectedGroupId),
      api.getOrCreateLesson(selectedGroupId, todayIso()),
    ])
      .then(([roster, lesson]) => {
        setStudents(roster);
        setLessonId(lesson.id);

        const initial: Record<string, StatusValue> = {};
        for (const s of roster) {
          const existing = lesson.attendance_records.find((r) => r.student_id === s.id);
          initial[s.id] = (existing?.status as StatusValue) ?? "present";
        }
        setStatuses(initial);
      })
      .catch(() => setError("Не удалось загрузить список учеников группы"))
      .finally(() => setLoadingRoster(false));
  }, [selectedGroupId]);

  function setStatus(studentId: string, status: StatusValue) {
    setStatuses((prev) => ({ ...prev, [studentId]: status }));
    setSaved(false);
  }

  function markAllPresent() {
    const next: Record<string, StatusValue> = {};
    for (const s of students) next[s.id] = "present";
    setStatuses(next);
    setSaved(false);
  }

  async function handleSave() {
    if (!lessonId) return;
    setSaving(true);
    setError(null);
    try {
      await api.markAttendance(
        lessonId,
        students.map((s) => ({ student_id: s.id, status: statuses[s.id] ?? "present" }))
      );
      setSaved(true);
    } catch {
      setError("Не удалось сохранить посещаемость");
    } finally {
      setSaving(false);
    }
  }

  const presentCount = Object.values(statuses).filter((s) => s === "present").length;

  return (
    <div className="flex flex-col sm:flex-row">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-8 max-w-2xl pb-24 sm:pb-8">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mb-1">Посещаемость</h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">
          {new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
        </p>

        {loading ? (
          <p className="text-sm text-[var(--color-text-muted)]">Загрузка...</p>
        ) : groups.length === 0 ? (
          <div className="bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] rounded-xl p-10 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">Сначала создайте группу с учениками.</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Группа</label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="text-sm text-[var(--color-danger)] bg-[var(--color-danger-bg)] rounded-lg px-3 py-2 mb-4">
                {error}
              </div>
            )}

            {loadingRoster ? (
              <p className="text-sm text-[var(--color-text-muted)]">Загрузка учеников...</p>
            ) : students.length === 0 ? (
              <div className="bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] rounded-xl p-10 text-center">
                <p className="text-sm text-[var(--color-text-muted)]">В этой группе пока нет учеников.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {presentCount} из {students.length} отмечены "был"
                  </p>
                  <button
                    onClick={markAllPresent}
                    className="text-xs font-medium text-[var(--color-accent)] hover:underline"
                  >
                    Отметить всех "был"
                  </button>
                </div>

                <div className="space-y-2">
                  {students.map((s) => (
                    <div
                      key={s.id}
                      className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3"
                    >
                      <p className="text-sm font-medium mb-2.5">{s.full_name}</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {STATUS_OPTIONS.map((opt) => {
                          const active = statuses[s.id] === opt.value;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => setStatus(s.id, opt.value)}
                              className={`flex flex-col items-center justify-center gap-0.5 rounded-lg border py-2.5 text-xs font-medium transition-colors ${
                                active
                                  ? STATUS_STYLES[opt.value]
                                  : "bg-[var(--color-bg)] text-[var(--color-text-muted)] border-[var(--color-border)]"
                              }`}
                            >
                              <span className="text-base leading-none">{opt.shortLabel}</span>
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="fixed sm:sticky bottom-0 left-0 right-0 sm:mt-6 bg-[var(--color-surface)] border-t sm:border border-[var(--color-border)] sm:rounded-xl p-4 flex items-center gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium py-3 hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
                  >
                    {saving ? "Сохраняем..." : saved ? "✓ Сохранено" : "Сохранить посещаемость"}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
