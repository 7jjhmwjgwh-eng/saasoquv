"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { api, getToken, Room } from "@/lib/api";

export default function RoomsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState(15);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    return api.listRooms().then(setRooms);
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
      await api.createRoom({ name, capacity });
      setName("");
      setCapacity(15);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать аудиторию");
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
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mb-1">Аудитории</h1>
            <p className="text-sm text-[var(--color-text-muted)]">{rooms.length} аудиторий</p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium px-4 py-2 hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            + Добавить аудиторию
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 mb-6 flex items-end gap-3"
          >
            {error && (
              <div className="text-sm text-[var(--color-danger)] bg-[var(--color-danger-bg)] rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Название</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Кабинет 1"
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              />
            </div>
            <div className="w-32">
              <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Вместимость</label>
              <input
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
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
        ) : rooms.length === 0 ? (
          <div className="bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] rounded-xl p-10 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">
              Пока нет аудиторий — добавьте первую, чтобы можно было создавать расписание групп.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {rooms.map((r) => (
              <div key={r.id} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
                <h3 className="font-semibold mb-1">{r.name}</h3>
                <p className="text-sm text-[var(--color-text-muted)]">до {r.capacity} мест</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
