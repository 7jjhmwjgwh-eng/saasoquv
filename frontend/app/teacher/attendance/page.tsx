"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PanelLayout } from "@/components/PanelLayout";
import { api, getToken, Group, GroupStudent } from "@/lib/api";

const NAV = [
  { href: "/teacher", label: "Главная", icon: "🏠" },
  { href: "/teacher/attendance", label: "Посещаемость", icon: "✅" },
  { href: "/teacher/homework", label: "ДЗ", icon: "📝" },
];

type Status = "present" | "absent" | "late" | "excused";

const STATUSES: { value: Status; label: string; emoji: string; style: string }[] = [
  { value: "present", label: "Был", emoji: "✓", style: "bg-[var(--color-success)] text-white border-[var(--color-success)]" },
  { value: "absent", label: "Нет", emoji: "✕", style: "bg-[var(--color-danger)] text-white border-[var(--color-danger)]" },
  { value: "late", label: "Опоздал", emoji: "⏰", style: "bg-[var(--color-warning)] text-white border-[var(--color-warning)]" },
  { value: "excused", label: "Уваж.", emoji: "🟡", style: "bg-[var(--color-text-muted)] text-white border-[var(--color-text-muted)]" },
];

function AttendanceContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState(params.get("group") ?? "");
  const [students, setStudents] = useState<GroupStudent[]>([]);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [loading, setLoading] = useState(true);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    api.listGroups().then(g => {
      setGroups(g);
      if (!selectedGroup && g.length > 0) setSelectedGroup(g[0].id);
    }).finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!selectedGroup) return;
    setRosterLoading(true);
    setSaved(false);
    Promise.all([api.getGroupStudents(selectedGroup), api.getOrCreateLesson(selectedGroup, today)])
      .then(([roster, lesson]) => {
        setStudents(roster);
        setLessonId(lesson.id);
        const init: Record<string, Status> = {};
        for (const s of roster) {
          const ex = lesson.attendance_records.find(r => r.student_id === s.id);
          init[s.id] = (ex?.status as Status) ?? "present";
        }
        setStatuses(init);
      })
      .finally(() => setRosterLoading(false));
  }, [selectedGroup, today]);

  async function handleSave() {
    if (!lessonId) return;
    setSaving(true);
    try {
      await api.markAttendance(lessonId, students.map(s => ({ student_id: s.id, status: statuses[s.id] ?? "present" })));
      setSaved(true);
    } finally { setSaving(false); }
  }

  const presentCount = Object.values(statuses).filter(s => s === "present").length;

  return (
    <PanelLayout title="Учитель" navItems={NAV}>
      <div className="p-4 sm:p-8 max-w-2xl pb-24 sm:pb-8">
        <h1 className="text-xl font-semibold mb-1">Посещаемость</h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          {new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
        </p>

        {loading ? <p className="text-sm text-[var(--color-text-muted)]">Загрузка...</p> : (<>
          <div className="mb-4">
            <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]">
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>

          {rosterLoading ? <p className="text-sm text-[var(--color-text-muted)]">Загрузка...</p> :
            students.length === 0 ? (
              <div className="bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] rounded-2xl p-8 text-center">
                <p className="text-sm text-[var(--color-text-muted)]">В этой группе пока нет учеников</p>
              </div>
            ) : (<>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-[var(--color-text-muted)]">{presentCount} из {students.length} присутствуют</p>
                <button onClick={() => {
                  const all: Record<string, Status> = {};
                  students.forEach(s => all[s.id] = "present");
                  setStatuses(all); setSaved(false);
                }} className="text-xs font-medium text-[var(--color-accent)] hover:underline">
                  Все присутствуют
                </button>
              </div>

              <div className="space-y-2">
                {students.map(s => (
                  <div key={s.id} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-3">
                    <p className="text-sm font-medium mb-2.5">{s.full_name}</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {STATUSES.map(opt => {
                        const active = statuses[s.id] === opt.value;
                        return (
                          <button key={opt.value} onClick={() => { setStatuses(p => ({ ...p, [s.id]: opt.value })); setSaved(false); }}
                            className={`flex flex-col items-center py-2.5 rounded-xl border text-xs font-medium transition-colors ${active ? opt.style : "bg-[var(--color-bg)] text-[var(--color-text-muted)] border-[var(--color-border)]"}`}>
                            <span className="text-base mb-0.5">{opt.emoji}</span>
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Sticky save */}
              <div className="fixed sm:sticky bottom-0 left-0 right-0 sm:mt-6 bg-[var(--color-surface)] border-t sm:border border-[var(--color-border)] sm:rounded-2xl p-4">
                <button onClick={handleSave} disabled={saving}
                  className={`w-full rounded-xl text-white text-sm font-semibold py-3 transition-colors disabled:opacity-50 ${saved ? "bg-[var(--color-success)]" : "bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)]"}`}>
                  {saving ? "Сохраняем..." : saved ? "✓ Сохранено" : "Сохранить посещаемость"}
                </button>
              </div>
            </>)
          }
        </>)}
      </div>
    </PanelLayout>
  );
}

export default function TeacherAttendance() {
  return <Suspense><AttendanceContent /></Suspense>;
}
