"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  studentApi,
  getStudentToken,
  StudentProfile,
  StudentAttendanceItem,
  StudentHomeworkItem,
} from "@/lib/studentApi";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  present: { label: "Был на занятии", className: "bg-[var(--color-success-bg)] text-[var(--color-success)]" },
  late: { label: "Опоздал", className: "bg-[var(--color-warning-bg)] text-[var(--color-warning)]" },
  absent: { label: "Пропустил", className: "bg-[var(--color-danger-bg)] text-[var(--color-danger)]" },
  excused: { label: "Уважительная причина", className: "bg-[var(--color-bg)] text-[var(--color-text-muted)]" },
};

export default function StudentPortalPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [attendance, setAttendance] = useState<StudentAttendanceItem[]>([]);
  const [homework, setHomework] = useState<StudentHomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getStudentToken()) {
      router.push("/portal/login");
      return;
    }
    Promise.all([studentApi.me(), studentApi.attendance(), studentApi.homework()])
      .then(([p, a, h]) => {
        setProfile(p);
        setAttendance(a);
        setHomework(h);
      })
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

  const missedCount = attendance.filter((a) => a.status === "absent").length;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--color-text-muted)]">Привет,</p>
          <h1 className="text-lg font-semibold">{profile?.full_name}</h1>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
        >
          Выйти
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 text-center">
            <p className="text-3xl font-semibold text-[var(--color-accent)]">{profile?.total_points ?? 0}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">баллов</p>
          </div>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 text-center">
            <p className={`text-3xl font-semibold ${missedCount > 0 ? "text-[var(--color-warning)]" : "text-[var(--color-success)]"}`}>
              {missedCount}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">пропусков</p>
          </div>
        </div>

        <section>
          <h2 className="text-sm font-semibold mb-3">Посещаемость</h2>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
            {attendance.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] p-5">Пока нет записей о занятиях.</p>
            ) : (
              attendance.slice(0, 20).map((a) => {
                const status = STATUS_LABELS[a.status] ?? { label: a.status, className: "" };
                return (
                  <div
                    key={a.id}
                    className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)] last:border-0"
                  >
                    <span className="text-sm text-[var(--color-text-muted)]">{a.lesson_date ?? "—"}</span>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${status.className}`}>
                      {status.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-3">Домашние задания</h2>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
            {homework.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] p-5">Пока нет сданных заданий.</p>
            ) : (
              homework.map((h) => (
                <div key={h.id} className="px-5 py-3 border-b border-[var(--color-border)] last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-text-muted)]">
                      {h.submitted_at ? new Date(h.submitted_at).toLocaleDateString("ru-RU") : "Не сдано"}
                    </span>
                    <span className="text-sm font-medium">
                      {h.grade !== null ? `${h.grade} баллов` : "Не оценено"}
                    </span>
                  </div>
                  {h.teacher_comment && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">{h.teacher_comment}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
