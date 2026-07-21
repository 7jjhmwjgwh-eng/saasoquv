"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PanelLayout } from "@/components/PanelLayout";
import { api, getToken, Group } from "@/lib/api";

const NAV = [
  { href: "/teacher", label: "Главная", icon: "🏠" },
  { href: "/teacher/attendance", label: "Посещаемость", icon: "✅" },
  { href: "/teacher/homework", label: "ДЗ", icon: "📝" },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function authFetch(path: string, init?: RequestInit) {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail ?? res.statusText);
  return res.json();
}

interface Homework {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
}

interface Submission {
  id: string;
  homework_id: string;
  student_id: string;
  submitted_at: string | null;
  grade: number | null;
  teacher_comment: string | null;
  is_completed: boolean;
}

export default function TeacherHomework() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [homework, setHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  // Grading panel
  const [selectedHw, setSelectedHw] = useState<Homework | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    api.listGroups().then(g => {
      setGroups(g);
      if (g.length > 0) setSelectedGroup(g[0].id);
    }).finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!selectedGroup) return;
    authFetch(`/api/homework/group/${selectedGroup}`).then(setHomework).catch(() => setHomework([]));
  }, [selectedGroup]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      await authFetch("/api/homework", {
        method: "POST",
        body: JSON.stringify({ group_id: selectedGroup, title, description: description || null, due_date: dueDate || null }),
      });
      setTitle(""); setDescription(""); setDueDate(""); setShowForm(false);
      const hw = await authFetch(`/api/homework/group/${selectedGroup}`);
      setHomework(hw);
    } finally { setSaving(false); }
  }

  async function openSubmissions(hw: Homework) {
    setSelectedHw(hw);
    const subs = await authFetch(`/api/homework/${hw.id}/submissions`).catch(() => []);
    setSubmissions(subs);
  }

  async function grade(submissionId: string, grade: number, comment: string) {
    await authFetch(`/api/homework/submissions/${submissionId}/grade`, {
      method: "POST",
      body: JSON.stringify({ grade, teacher_comment: comment || null }),
    });
    if (selectedHw) await openSubmissions(selectedHw);
  }

  return (
    <PanelLayout title="Учитель" navItems={NAV}>
      <div className="p-4 sm:p-8 max-w-2xl pb-24 sm:pb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Домашние задания</h1>
          <button onClick={() => setShowForm(v => !v)}
            className="rounded-xl bg-[var(--color-accent)] text-white text-sm font-semibold px-4 py-2.5 hover:bg-[var(--color-accent-hover)] transition-colors">
            + Выдать ДЗ
          </button>
        </div>

        {loading ? <p className="text-sm text-[var(--color-text-muted)]">Загрузка...</p> : (<>
          <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]">
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>

          {showForm && (
            <form onSubmit={handleCreate} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 mb-4 space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Название задания</label>
                <input required value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Описание</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                  className="w-full rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Дедлайн</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
              </div>
              <button type="submit" disabled={saving}
                className="rounded-xl bg-[var(--color-accent)] text-white text-sm font-semibold px-4 py-2.5 disabled:opacity-50">
                {saving ? "Сохраняем..." : "Выдать группе"}
              </button>
            </form>
          )}

          {selectedHw && (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold">{selectedHw.title} — сдачи</h2>
                <button onClick={() => setSelectedHw(null)} className="text-xs text-[var(--color-text-muted)]">✕ Закрыть</button>
              </div>
              {submissions.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">Пока никто не сдал</p>
              ) : submissions.map(sub => (
                <GradeRow key={sub.id} sub={sub} onGrade={grade} />
              ))}
            </div>
          )}

          <div className="space-y-2">
            {homework.length === 0 ? (
              <div className="bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] rounded-2xl p-8 text-center">
                <p className="text-sm text-[var(--color-text-muted)]">Нет заданий. Выдайте первое!</p>
              </div>
            ) : homework.map(hw => (
              <div key={hw.id} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{hw.title}</p>
                    {hw.description && <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{hw.description}</p>}
                    {hw.due_date && <p className="text-xs text-[var(--color-warning)] mt-1">Дедлайн: {hw.due_date}</p>}
                  </div>
                  <button onClick={() => openSubmissions(hw)}
                    className="text-xs font-medium text-[var(--color-accent)] hover:underline whitespace-nowrap ml-3">
                    Проверить →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>)}
      </div>
    </PanelLayout>
  );
}

function GradeRow({ sub, onGrade }: { sub: Submission; onGrade: (id: string, g: number, c: string) => Promise<void> }) {
  const [grade, setGrade] = useState(sub.grade?.toString() ?? "");
  const [comment, setComment] = useState(sub.teacher_comment ?? "");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try { await onGrade(sub.id, Number(grade), comment); } finally { setSaving(false); }
  }

  return (
    <div className="border-b border-[var(--color-border)] pb-3 mb-3 last:border-0 last:mb-0 last:pb-0">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium">{sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString("ru-RU") : "не сдано"}</span>
        {sub.grade !== null && <span className="text-xs text-[var(--color-success)]">оценка: {sub.grade}</span>}
      </div>
      <div className="flex gap-2">
        <input type="number" min={0} max={100} value={grade} onChange={e => setGrade(e.target.value)} placeholder="Балл"
          className="w-20 rounded-lg border border-[var(--color-border)] px-2 py-1 text-sm focus:outline-none" />
        <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Комментарий"
          className="flex-1 rounded-lg border border-[var(--color-border)] px-2 py-1 text-sm focus:outline-none" />
        <button onClick={submit} disabled={saving || !grade}
          className="rounded-lg bg-[var(--color-accent)] text-white text-xs px-3 py-1 disabled:opacity-50">
          {saving ? "..." : "Сохранить"}
        </button>
      </div>
    </div>
  );
}
