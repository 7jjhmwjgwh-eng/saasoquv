"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PanelLayout } from "@/components/PanelLayout";
import { api, getToken, Debtor, Payment, Student } from "@/lib/api";

const NAV = [
  { href: "/admin", label: "Главная", icon: "🏠" },
  { href: "/admin/students", label: "Ученики", icon: "👨‍🎓" },
  { href: "/admin/payments", label: "Оплаты", icon: "💰" },
  { href: "/director/staff", label: "Сотрудники", icon: "👥" },
];

export default function AdminPayments() {
  const router = useRouter();
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 10);
  });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  function load() {
    return Promise.all([api.listDebtors(), api.listPayments(), api.listStudents()])
      .then(([d, p, s]) => { setDebtors(d); setPayments(p); setStudents(s); });
  }

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    load().finally(() => setLoading(false));
  }, [router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      await api.createPayment({ student_id: studentId, amount: Number(amount), method, paid_at: paidAt, valid_until: validUntil || undefined });
      setAmount(""); setStudentId(""); setShowForm(false);
      await load();
    } finally { setSaving(false); }
  }

  function openPayFor(sid: string) {
    setStudentId(sid); setShowForm(true);
    setTimeout(() => document.getElementById("pay-form")?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  const nameById = (id: string) => students.find(s => s.id === id)?.full_name ?? "—";
  const methodLabels: Record<string, string> = { cash: "Наличные", card: "Карта", click: "Click", payme: "Payme", other: "Другое" };

  return (
    <PanelLayout title="Администратор" navItems={NAV}>
      <div className="p-4 sm:p-8 max-w-3xl pb-24 sm:pb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Оплаты</h1>
          <button onClick={() => setShowForm(v => !v)}
            className="rounded-xl bg-[var(--color-accent)] text-white text-sm font-semibold px-4 py-2.5 hover:bg-[var(--color-accent-hover)] transition-colors">
            + Принять
          </button>
        </div>

        {loading ? <p className="text-sm text-[var(--color-text-muted)]">Загрузка...</p> : (<>

          {showForm && (
            <form id="pay-form" onSubmit={handleCreate} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 mb-6 space-y-3">
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
                  <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Сумма</label>
                  <input required type="number" min={0} value={amount} onChange={e => setAmount(e.target.value)} placeholder="500 000"
                    className="w-full rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Способ</label>
                  <select value={method} onChange={e => setMethod(e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]">
                    {Object.entries(methodLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">Дата</label>
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
                {saving ? "Сохраняем..." : "Сохранить"}
              </button>
            </form>
          )}

          {debtors.length > 0 && (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden mb-4">
              <div className="px-5 py-3 border-b border-[var(--color-border)]">
                <p className="text-sm font-semibold text-[var(--color-danger)]">⚠️ Должники — {debtors.length} чел.</p>
              </div>
              {debtors.map(d => (
                <div key={d.student_id} className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)] last:border-0">
                  <div>
                    <p className="text-sm font-medium">{d.full_name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{d.phone} · {d.days_overdue ? `${d.days_overdue} дн. просрочка` : "не платил"}</p>
                  </div>
                  <button onClick={() => openPayFor(d.student_id)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-[var(--color-accent)] text-white">
                    Принять оплату
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--color-border)]">
              <p className="text-sm font-semibold">Последние платежи</p>
            </div>
            {payments.slice(0, 20).map(p => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)] last:border-0">
                <div>
                  <p className="text-sm font-medium">{nameById(p.student_id)}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{p.paid_at} · {methodLabels[p.method] ?? p.method}</p>
                </div>
                <p className="text-sm font-semibold">{Number(p.amount).toLocaleString("ru-RU")}</p>
              </div>
            ))}
          </div>
        </>)}
      </div>
    </PanelLayout>
  );
}
