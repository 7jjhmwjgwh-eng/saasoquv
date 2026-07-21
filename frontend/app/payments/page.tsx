"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { api, getToken, Debtor, Payment, Student } from "@/lib/api";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function plusMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

export default function PaymentsPage() {
  const router = useRouter();
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [studentId, setStudentId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [paidAt, setPaidAt] = useState(today());
  const [validUntil, setValidUntil] = useState(plusMonth());

  function loadAll() {
    return Promise.all([api.listDebtors(), api.listPayments(), api.listStudents()]).then(
      ([d, p, s]) => {
        setDebtors(d);
        setPayments(p);
        setStudents(s);
      }
    );
  }

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    loadAll().finally(() => setLoading(false));
  }, [router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.createPayment({
        student_id: studentId,
        amount: Number(amount),
        method,
        paid_at: paidAt,
        valid_until: validUntil || undefined,
      });
      setAmount("");
      setStudentId("");
      setShowForm(false);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить оплату");
    } finally {
      setSaving(false);
    }
  }

  const nameById = (id: string) => students.find((s) => s.id === id)?.full_name ?? "—";
  const monthTotal = payments
    .filter((p) => p.paid_at.slice(0, 7) === today().slice(0, 7))
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="flex flex-col sm:flex-row">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-8 max-w-5xl pb-24 sm:pb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mb-1">Оплаты</h1>
            <p className="text-sm text-[var(--color-text-muted)]">Кто оплатил, кто должен</p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium px-4 py-2 hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            + Принять оплату
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-[var(--color-text-muted)]">Загрузка...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
                <p className="text-xs text-[var(--color-text-muted)] mb-1">Собрано в этом месяце</p>
                <p className="text-2xl font-semibold">{monthTotal.toLocaleString("ru-RU")}</p>
              </div>
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
                <p className="text-xs text-[var(--color-text-muted)] mb-1">Должников</p>
                <p
                  className={`text-2xl font-semibold ${
                    debtors.length > 0 ? "text-[var(--color-danger)]" : "text-[var(--color-success)]"
                  }`}
                >
                  {debtors.length}
                </p>
              </div>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">
                      Ученик
                    </label>
                    <select
                      required
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    >
                      <option value="">Выбрать ученика</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">
                      Сумма
                    </label>
                    <input
                      required
                      type="number"
                      min={0}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="500000"
                      className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">
                      Способ
                    </label>
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                      className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    >
                      <option value="cash">Наличные</option>
                      <option value="card">Карта</option>
                      <option value="click">Click</option>
                      <option value="payme">Payme</option>
                      <option value="other">Другое</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">
                      Дата оплаты
                    </label>
                    <input
                      type="date"
                      value={paidAt}
                      onChange={(e) => setPaidAt(e.target.value)}
                      className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[var(--color-text-muted)]">
                      Оплачено до
                    </label>
                    <input
                      type="date"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium px-4 py-2 hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
                >
                  {saving ? "Сохраняем..." : "Сохранить оплату"}
                </button>
              </form>
            )}

            <section className="mb-6">
              <h2 className="text-sm font-semibold mb-3">Должники</h2>
              {debtors.length === 0 ? (
                <div className="bg-[var(--color-success-bg)] border border-[var(--color-border)] rounded-xl p-5 text-center">
                  <p className="text-sm text-[var(--color-success)]">
                    Все активные ученики оплачены
                  </p>
                </div>
              ) : (
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
                  {debtors.map((d) => (
                    <div
                      key={d.student_id}
                      className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-[var(--color-border)] last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium">{d.full_name}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">{d.phone ?? "—"}</p>
                      </div>
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--color-danger-bg)] text-[var(--color-danger)]">
                        {d.paid_until
                          ? `просрочка ${d.days_overdue} дн.`
                          : "не оплачивал"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-sm font-semibold mb-3">История платежей</h2>
              {payments.length === 0 ? (
                <div className="bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] rounded-xl p-8 text-center">
                  <p className="text-sm text-[var(--color-text-muted)]">Платежей пока нет</p>
                </div>
              ) : (
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
                  {payments.slice(0, 30).map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-[var(--color-border)] last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium">{nameById(p.student_id)}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {p.paid_at}
                          {p.valid_until ? ` → до ${p.valid_until}` : ""}
                        </p>
                      </div>
                      <span className="text-sm font-medium">
                        {Number(p.amount).toLocaleString("ru-RU")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
