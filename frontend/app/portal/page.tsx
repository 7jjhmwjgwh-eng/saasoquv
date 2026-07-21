"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { studentApi, getStudentToken, StudentProfile, StudentAttendanceItem, StudentHomeworkItem } from "@/lib/studentApi";

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  present: { label: "Был", class: "bg-[var(--color-success-bg)] text-[var(--color-success)]" },
  late: { label: "Опоздал", class: "bg-[var(--color-warning-bg)] text-[var(--color-warning)]" },
  absent: { label: "Пропустил", class: "bg-[var(--color-danger-bg)] text-[var(--color-danger)]" },
  excused: { label: "Уваж.", class: "bg-[var(--color-bg)] text-[var(--color-text-muted)]" },
};

export default function StudentPortal() {
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [attendance, setAttendance] = useState<StudentAttendanceItem[]>([]);
  const [homework, setHomework] = useState<StudentHomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getStudentToken()) { router.push("/portal/login"); return; }
    Promise.all([studentApi.me(), studentApi.attendance(), studentApi.homework()])
      .then(([p, a, h]) => { setProfile(p); setAttendance(a); setHomework(h); })
      .catch(() => router.push("/portal/login"))
      .finally(() => setLoading(false));
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("student_access_token");
    router.push("/portal/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <p className="text-sm text-[var(--color-text-muted)]">Загрузка...</p>
      </div>
    );
  }

  // Streak — consecutive "present" lessons from the end
  let streak = 0;
  for (let i = 0; i < attendance.length; i++) {
    if (attendance[i].status === "present") streak++;
    else break;
  }

  const missedCount = attendance.filter(a => a.status === "absent").length;
  const totalLessons = attendance.length;
  const attendancePct = totalLessons > 0 ? Math.round(((totalLessons - missedCount) / totalLessons) * 100) : 100;

  const pendingHw = homework.filter(h => !h.is_completed).length;
  const gradedHw = homework.filter(h => h.grade !== null);
  const avgGrade = gradedHw.length > 0
    ? Math.round(gradedHw.reduce((s, h) => s + (h.grade ?? 0), 0) / gradedHw.length)
    : null;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Header */}
      <header className="bg-[var(--color-accent)] text-white px-5 py-5">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm opacity-80">Мой кабинет</p>
            <button onClick={handleLogout} className="text-xs opacity-70 hover:opacity-100">Выйти</button>
          </div>
          <h1 className="text-xl font-bold">{profile?.full_name}</h1>
          {streak > 1 && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-lg">🔥</span>
              <span className="text-sm">{streak} занятий подряд без пропусков!</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4 pb-8">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-[var(--color-accent)]">{profile?.total_points ?? 0}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">баллов</p>
          </div>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 text-center">
            <p className={`text-2xl font-bold ${attendancePct >= 80 ? "text-[var(--color-success)]" : "text-[var(--color-warning)]"}`}>{attendancePct}%</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">посещ.</p>
          </div>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 text-center">
            <p className={`text-2xl font-bold ${avgGrade !== null ? (avgGrade >= 80 ? "text-[var(--color-success)]" : "text-[var(--color-warning)]") : "text-[var(--color-text-muted)]"}`}>
              {avgGrade !== null ? avgGrade : "—"}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">средний балл</p>
          </div>
        </div>

        {/* Homework */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
            <h2 className="text-sm font-semibold">Домашние задания</h2>
            {pendingHw > 0 && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--color-warning-bg)] text-[var(--color-warning)]">
                {pendingHw} не сдано
              </span>
            )}
          </div>
          {homework.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] p-5">Нет заданий</p>
          ) : homework.slice(0, 8).map(h => (
            <div key={h.id} className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)] last:border-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-base ${h.is_completed ? "opacity-100" : "opacity-40"}`}>{h.is_completed ? "✅" : "📝"}</span>
                  <span className="text-sm">{h.submitted_at ? new Date(h.submitted_at).toLocaleDateString("ru-RU") : "не сдано"}</span>
                </div>
                {h.teacher_comment && <p className="text-xs text-[var(--color-text-muted)] mt-0.5 ml-7">{h.teacher_comment}</p>}
              </div>
              {h.grade !== null ? (
                <span className={`text-sm font-semibold ${h.grade >= 80 ? "text-[var(--color-success)]" : h.grade >= 60 ? "text-[var(--color-warning)]" : "text-[var(--color-danger)]"}`}>
                  {h.grade} баллов
                </span>
              ) : (
                <span className="text-xs text-[var(--color-text-muted)]">ждёт оценки</span>
              )}
            </div>
          ))}
        </div>

        {/* Attendance history */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-semibold">Посещаемость</h2>
          </div>
          {attendance.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] p-5">Пока нет записей о занятиях</p>
          ) : attendance.slice(0, 15).map(a => {
            const cfg = STATUS_CONFIG[a.status] ?? { label: a.status, class: "" };
            return (
              <div key={a.id} className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)] last:border-0">
                <span className="text-sm text-[var(--color-text-muted)]">{a.lesson_date ?? "—"}</span>
                <div className="flex items-center gap-2">
                  {a.points_earned > 0 && <span className="text-xs text-[var(--color-success)]">+{a.points_earned}</span>}
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cfg.class}`}>{cfg.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
