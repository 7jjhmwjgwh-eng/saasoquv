"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PanelLayout } from "@/components/PanelLayout";
import { getToken, staffApi, StaffMember } from "@/lib/api";

const NAV = [
  { href: "/director", label: "Обзор", icon: "📊" },
  { href: "/director/staff", label: "Сотрудники", icon: "👥" },
  { href: "/director/payments", label: "Финансы", icon: "💰" },
  { href: "/director/reports", label: "Отчёты", icon: "📈" },
];

const ROLE_LABELS: Record<string, string> = {
  owner: "Директор",
  admin: "Администратор",
  teacher: "Учитель",
};

export default function StaffPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+998");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("teacher");

  function load() {
    return staffApi.list().then(setStaff);
  }

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    load().finally(() => setLoading(false));
  }, [router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await staffApi.create({ full_name: name, phone, email, password, role });
      setName(""); setPhone("+998"); setEmail(""); setPassword(""); setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать сотрудника");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    await staffApi.update(id, { is_active: !isActive });
    await load();
  }

  return (
    <PanelLayout title="Директор" navItems={NAV}>
      <div className="p-4 sm:p-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Сотрудники</h1>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-xl bg-[var(--color-accent)] text-white text-sm font-semibold px-4 py-2.5 hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            + Добавить
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 mb-6 space-y-3">
            {error && <div className="text-sm text-[var(--color-danger)] bg-[var(--color-danger-bg)] rounded-xl px-4 py-3">{error}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Имя и фамилия</label>
                <input required value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Телефон</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Пароль</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Роль</label>
                <select value={role} onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]">
                  <option value="teacher">Учитель</option>
                  <option value="admin">Администратор</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={saving}
              className="rounded-xl bg-[var(--color-accent)] text-white text-sm font-semibold px-4 py-2.5 hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50">
              {saving ? "Сохраняем..." : "Создать сотрудника"}
            </button>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-[var(--color-text-muted)]">Загрузка...</p>
        ) : (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
            {staff.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] last:border-0">
                <div>
                  <p className="text-sm font-medium">{s.full_name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{s.phone} · {s.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--color-bg)] text-[var(--color-text-muted)]">
                    {ROLE_LABELS[s.role] ?? s.role}
                  </span>
                  <button
                    onClick={() => toggleActive(s.id, s.is_active)}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                      s.is_active
                        ? "bg-[var(--color-success-bg)] text-[var(--color-success)]"
                        : "bg-[var(--color-danger-bg)] text-[var(--color-danger)]"
                    }`}
                  >
                    {s.is_active ? "Активен" : "Заблокирован"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PanelLayout>
  );
}
