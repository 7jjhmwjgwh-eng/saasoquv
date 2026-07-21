"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { api, getToken, Student } from "@/lib/api";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  lead: { label: "Лид", className: "bg-[var(--color-warning-bg)] text-[var(--color-warning)]" },
  trial: { label: "Пробный", className: "bg-[var(--color-warning-bg)] text-[var(--color-warning)]" },
  active: { label: "Активен", className: "bg-[var(--color-success-bg)] text-[var(--color-success)]" },
  dropped: { label: "Отчислен", className: "bg-[var(--color-danger-bg)] text-[var(--color-danger)]" },
};

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("");
  const [saving, setSaving] = useState(false);

  function loadStudents() {
    return api.listStudents().then(setStudents);
  }

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    loadStudents().finally(() => setLoading(false));
  }, [router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createStudent({ full_name: name, phone: phone || undefined, source: source || undefined });
      setName("");
      setPhone("");
      setSource("");
      setShowForm(false);
      await loadStudents();
    } finally {
      setSaving(false);
    }
  }

  async function handleSetPassword(studentId: string, studentName: string) {
    const password = window.prompt(`Пароль для входа в кабинет ученика "${studentName}" (минимум 4 символа):`);
    if (!password || password.length < 4) return;
    try {
      await api.setStudentPassword(studentId, password);
      window.alert("Пароль установлен. Сообщите его ученику — он войдёт на /portal/login по номеру телефона и этому паролю.");
    } catch {
      window.alert("Не удалось установить пароль.");
    }
  }

  return (
    <div className="flex flex-col sm:flex-row">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-8 max-w-6xl pb-24 sm:pb-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mb-1">Ученики</h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              {students.length} {pluralizeStudents(students.length)}
            </p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium px-4 py-2 hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            + Добавить ученика
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
          >
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Имя</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Телефон</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998..."
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Источник</label>
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="instagram..."
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              />
            </div>
            <div className="sm:col-span-4">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium px-4 py-2 hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
              >
                {saving ? "Сохраняем..." : "Сохранить"}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-[var(--color-text-muted)]">Загрузка...</p>
        ) : students.length === 0 ? (
          <div className="bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] rounded-xl p-10 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">Пока нет учеников — добавьте первого.</p>
          </div>
        ) : (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                  <th className="px-5 py-3 font-medium">Имя</th>
                  <th className="px-5 py-3 font-medium">Телефон</th>
                  <th className="px-5 py-3 font-medium">Статус</th>
                  <th className="px-5 py-3 font-medium text-right">Баллы</th>
                  <th className="px-5 py-3 font-medium text-right">Кабинет</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const status = STATUS_LABELS[s.status] ?? { label: s.status, className: "" };
                  return (
                    <tr key={s.id} className="border-b border-[var(--color-border)] last:border-0">
                      <td className="px-5 py-3 font-medium">{s.full_name}</td>
                      <td className="px-5 py-3 text-[var(--color-text-muted)]">{s.phone || "—"}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex rounded-full text-xs font-medium px-2.5 py-1 ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-medium">{s.total_points}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => handleSetPassword(s.id, s.full_name)}
                          className="text-xs text-[var(--color-accent)] hover:underline"
                        >
                          Выдать пароль
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function pluralizeStudents(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return "ученик";
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return "ученика";
  return "учеников";
}
