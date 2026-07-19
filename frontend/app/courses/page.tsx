"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { api, getToken, Course } from "@/lib/api";

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [levelsText, setLevelsText] = useState("Beginner, Elementary, Pre-Intermediate, Intermediate");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    return api.listCourses().then(setCourses);
  }

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    load().finally(() => setLoading(false));
  }, [router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const levels = levelsText
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean);
      await api.createCourse({ name, levels });
      setName("");
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать курс");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col sm:flex-row">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-8 max-w-4xl pb-24 sm:pb-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mb-1">Курсы и уровни</h1>
            <p className="text-sm text-[var(--color-text-muted)]">{courses.length} курсов</p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium px-4 py-2 hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            + Добавить курс
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 mb-6 space-y-3"
          >
            {error && (
              <div className="text-sm text-[var(--color-danger)] bg-[var(--color-danger-bg)] rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Название курса</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="English"
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">
                Уровни (через запятую)
              </label>
              <input
                value={levelsText}
                onChange={(e) => setLevelsText(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium px-4 py-2 hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
            >
              {saving ? "Сохраняем..." : "Сохранить"}
            </button>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-[var(--color-text-muted)]">Загрузка...</p>
        ) : courses.length === 0 ? (
          <div className="bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] rounded-xl p-10 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">
              Пока нет курсов — добавьте первый (например, "English" с уровнями Beginner/Elementary/...).
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {courses.map((c) => (
              <div key={c.id} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
                <h3 className="font-semibold mb-2">{c.name}</h3>
                {c.levels.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {c.levels
                      .slice()
                      .sort((a, b) => a.order_index - b.order_index)
                      .map((l) => (
                        <span
                          key={l.id}
                          className="text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--color-bg)] text-[var(--color-text-muted)]"
                        >
                          {l.name}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
