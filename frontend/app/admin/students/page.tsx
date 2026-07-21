"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PanelLayout } from "@/components/PanelLayout";
import { api, getToken, Student, Group } from "@/lib/api";

const NAV = [
  { href: "/admin", label: "Главная", icon: "🏠" },
  { href: "/admin/students", label: "Ученики", icon: "👨‍🎓" },
  { href: "/admin/payments", label: "Оплаты", icon: "💰" },
  { href: "/director/staff", label: "Сотрудники", icon: "👥" },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  lead: { label: "Заявка", color: "bg-[var(--color-warning-bg)] text-[var(--color-warning)]" },
  trial: { label: "Пробный", color: "bg-[var(--color-warning-bg)] text-[var(--color-warning)]" },
  active: { label: "Активен", color: "bg-[var(--color-success-bg)] text-[var(--color-success)]" },
  dropped: { label: "Отчислен", color: "bg-[var(--color-danger-bg)] text-[var(--color-danger)]" },
};

const STATUS_ORDER = ["lead", "trial", "active", "dropped"];

export default function AdminStudents() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+998");
  const [parentPhone, setParentPhone] = useState("+998");
  const [birthDate, setBirthDate] = useState("");
  const [source, setSource] = useState("");

  function load() {
    return Promise.all([api.listStudents(), api.listGroups()]).then(([s, g]) => {
      setStudents(s); setGroups(g);
    });
  }

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    load().finally(() => setLoading(false));
  }, [router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      await api.createStudent({ full_name: name, phone, parent_phone: parentPhone, birth_date: birthDate || undefined, source: source || undefined });
      setName(""); setPhone("+998"); setParentPhone("+998"); setBirthDate(""); setSource(""); setShowForm(false);
      await load();
    } finally { setSaving(false); }
  }

  async function changeStatus(id: string, status: string) {
    await api.updateStudent(id, { status });
    await load();
  }

  async function handleSetPassword(id: string, name: string) {
    const pw = window.prompt(`Новый пароль для "${name}" (мин. 4 символа):`);
    if (!pw || pw.length < 4) return;
    await api.setStudentPassword(id, pw);
    alert(`Пароль установлен. Ученик входит на /portal/login по телефону и этому паролю.`);
  }

  const filtered = students
    .filter(s => filter === "all" || s.status === filter)
    .filter(s => !search || s.full_name.toLowerCase().includes(search.toLowerCase()) || (s.phone || "").includes(search));

  return (
    <PanelLayout title="Администратор" navItems={NAV}>
      <div className="p-4 sm:p-8 max-w-4xl pb-24 sm:pb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Ученики</h1>
          <button onClick={() => setShowForm(v => !v)}
            className="rounded-xl bg-[var(--color-accent)] text-white text-sm font-semibold px-4 py-2.5 hover:bg-[var(--color-accent-hover)] transition-colors">
            + Добавить
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {["all", ...STATUS_ORDER].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${filter === s ? "bg-[var(--color-accent)] text-white" : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]"}`}>
              {s === "all" ? "Все" : STATUS_LABELS[s]?.label}
              <span className="ml-1 opacity-70">({students.filter(x => s === "all" || x.status === s).length})</span>
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по имени или телефону..."
          className="w-full rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />

        {showForm && (
          <form onSubmit={handleCreate} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 mb-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Имя и фамилия</label>
                <input required value={name} onChange={e => setName(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Телефон ученика</label>
                <input value={phone} onChange={e => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Телефон родителя</label>
                <input value={parentPhone} onChange={e => setParentPhone(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Дата рождения</label>
                <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Источник (откуда узнал)</label>
                <input value={source} onChange={e => setSource(e.target.value)} placeholder="Instagram, реклама, знакомые..."
                  className="w-full rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
              </div>
            </div>
            <button type="submit" disabled={saving}
              className="rounded-xl bg-[var(--color-accent)] text-white text-sm font-semibold px-4 py-2.5 disabled:opacity-50">
              {saving ? "Сохраняем..." : "Добавить ученика"}
            </button>
          </form>
        )}

        {loading ? <p className="text-sm text-[var(--color-text-muted)]">Загрузка...</p> : filtered.length === 0 ? (
          <div className="bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] rounded-2xl p-10 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">Нет учеников</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(s => {
              const st = STATUS_LABELS[s.status] ?? { label: s.status, color: "" };
              return (
                <div key={s.id} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium">{s.full_name}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {s.phone && <a href={`tel:${s.phone}`} className="text-xs text-[var(--color-accent)]">{s.phone}</a>}
                        {s.parent_phone && <span className="text-xs text-[var(--color-text-muted)]">родитель: {s.parent_phone}</span>}
                        {s.birth_date && <span className="text-xs text-[var(--color-text-muted)]">д.р. {s.birth_date}</span>}
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${st.color}`}>{st.label}</span>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center mt-2">
                    {/* Status change */}
                    <select value={s.status} onChange={e => changeStatus(s.id, e.target.value)}
                      className="text-xs rounded-lg border border-[var(--color-border)] px-2 py-1 focus:outline-none">
                      {STATUS_ORDER.map(st => <option key={st} value={st}>{STATUS_LABELS[st].label}</option>)}
                    </select>

                    {/* Payment status badge */}
                    {s.paid_until ? (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.is_payment_overdue ? "bg-[var(--color-danger-bg)] text-[var(--color-danger)]" : "bg-[var(--color-success-bg)] text-[var(--color-success)]"}`}>
                        {s.is_payment_overdue ? `просрочено` : `оплачено до ${s.paid_until}`}
                      </span>
                    ) : (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--color-bg)] text-[var(--color-text-muted)]">не оплачивал</span>
                    )}

                    {/* Attendance */}
                    {s.lessons_total > 0 && (
                      <span className={`text-xs px-2.5 py-1 rounded-full ${s.lessons_missed >= 3 ? "bg-[var(--color-warning-bg)] text-[var(--color-warning)]" : "bg-[var(--color-bg)] text-[var(--color-text-muted)]"}`}>
                        {s.lessons_missed} пропусков
                      </span>
                    )}

                    <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--color-bg)] text-[var(--color-text-muted)]">
                      ⭐ {s.total_points}
                    </span>

                    <button onClick={() => handleSetPassword(s.id, s.full_name)}
                      className="text-xs text-[var(--color-accent)] hover:underline">
                      Выдать пароль
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PanelLayout>
  );
}
