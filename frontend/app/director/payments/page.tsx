"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PanelLayout } from "@/components/PanelLayout";
import { api, getToken, Payment, Debtor, Student } from "@/lib/api";

const NAV = [
  { href: "/director", label: "Обзор", icon: "📊" },
  { href: "/director/staff", label: "Сотрудники", icon: "👥" },
  { href: "/director/payments", label: "Финансы", icon: "💰" },
  { href: "/director/reports", label: "Отчёты", icon: "📈" },
];

export default function DirectorPayments() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState("");

  function load() {
    return Promise.all([api.listPayments(), api.listDebtors(), api.listStudents()])
      .then(([p, d, s]) => { setPayments(p); setDebtors(d); setStudents(s); });
  }

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    load().finally(() => setLoading(false));
  }, [router]);

  const filtered = payments.filter((p) => p.paid_at.startsWith(filterMonth));
  const total = filtered.reduce((s, p) => s + Number(p.amount), 0);
  const nameById = (id: string) => students.find((s) => s.id === id)?.full_name ?? id.slice(0, 8) + "...";

  const methodLabels: Record<string, string> = { cash: "Наличные", card: "Карта", click: "Click", payme: "Payme", other: "Другое" };

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createPayment({ student_id: studentId, amount: Number(amount), method, paid_at: paidAt, valid_until: validUntil || undefined });
      setAmount(""); setStudentId(""); setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <PanelLayout title="Директор" navItems={NAV}>
      <div className="p-4 sm:p-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Финансы</h1>
          <button onClick={() => setShowForm(v => !v)}
            className="rounded-xl bg-[var(--color-accent)] text-white text-sm font-semibold px-4 py-2.5 hover:bg-[var(--color-accent-hover)] transition-colors">
            + Принять оплату
          </button>
        </div>

        {loading ? <p className="text-sm text-[var(--color-text-muted)]">Загрузка...</p> : (<>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-[var(--color-accent)] text-white rounded-2xl p-5">
              <p className="text-sm opacity-80 mb-1">Выручка за {filterMonth}</p>
              <p className="text-3xl font-bold">{total.toLocaleString("ru-RU")}</p>
              <p className="text-xs opacity-70 mt-1">{filtered.length} платежей</p>
            </div>
            <div className={`rounded-2xl p-5 border ${debtors.length > 0 ? "bg-[var(--color-danger-bg)] border-[var(--color-danger)]" : "bg-[var(--color-success-bg)] border-[var(--color-border)]"}`}>
              <p className="text-sm text-[var(--color-text-muted)] mb-1">Должников</p>
              <p className={`text-3xl font-bold ${debtors.length > 0 ? "text-[var(--color-danger)]" : "text-[var(--color-success)]"}`}>{debtors.length}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">активных учеников</p>
            </div>
          </div>

          {showForm && (
            <form onSubmit={handleCreate} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 mb-6 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Ученик</label>
                  <select required value={studentId} onChange={e => setStudentId(e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]">
                    <option value="">Выбрать ученика</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Сумма (сум)</label>
                  <input required type="number" min={0} value={amount} onChange={e => setAmount(e.target.value)} placeholder="500000"
                    className="w-full rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Способ оплаты</label>
                  <select value={method} onChange={e => setMethod(e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]">
                    {Object.entries(methodLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Дата оплаты</label>
                  <input type="date" value={paidAt} onChange={e => setPaidAt(e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Оплачено до</label>
                  <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
                </div>
              </div>
              <button type="submit" disabled={saving}
                className="rounded-xl bg-[var(--color-accent)] text-white text-sm font-semibold px-4 py-2.5 disabled:opacity-50">
                {saving ? "Сохраняем..." : "Сохранить оплату"}
              </button>
            </form>
          )}

          {debtors.length > 0 && (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden mb-6">
              <div className="px-5 py-3 border-b border-[var(--color-border)]">
                <h2 className="text-sm font-semibold text-[var(--color-danger)]">⚠️ Должники</h2>
              </div>
              {debtors.map(d => (
                <div key={d.student_id} className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)] last:border-0">
                  <div>
                    <p className="text-sm font-medium">{d.full_name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{d.phone}</p>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--color-danger-bg)] text-[var(--color-danger)]">
                    {d.days_overdue ? `${d.days_overdue} дн. просрочка` : "не платил"}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--color-border)] flex items-center gap-3">
              <h2 className="text-sm font-semibold">История платежей</h2>
              <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                className="ml-auto rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
            </div>
            {filtered.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] p-5">Платежей нет за этот месяц</p>
            ) : filtered.map(p => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)] last:border-0">
                <div>
                  <p className="text-sm font-medium">{nameById(p.student_id)}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{p.paid_at} · {methodLabels[p.method] ?? p.method}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{Number(p.amount).toLocaleString("ru-RU")}</p>
                  {p.valid_until && <p className="text-xs text-[var(--color-text-muted)]">до {p.valid_until}</p>}
                </div>
              </div>
            ))}
          </div>
        </>)}
      </div>
    </PanelLayout>
  );
}
