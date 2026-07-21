"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { api, getToken, Group, PaymentExpiring, Student } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [expiring, setExpiring] = useState<PaymentExpiring[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    Promise.all([api.listGroups(), api.listStudents(), api.getExpiringPayments(3)])
      .then(([g, s, p]) => {
        setGroups(g);
        setStudents(s);
        setExpiring(p);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const activeStudents = students.filter((s) => s.status === "active").length;
  const fullGroups = groups.filter((g) => g.free_slots === 0).length;

  return (
    <div className="flex flex-col sm:flex-row">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-8 max-w-6xl pb-24 sm:pb-8">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mb-1">Обзор центра</h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-8">
          Ключевые показатели на сегодня
        </p>

        {loading ? (
          <p className="text-sm text-[var(--color-text-muted)]">Загрузка...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
              <StatCard label="Активных учеников" value={activeStudents} />
              <StatCard label="Групп всего" value={groups.length} sub={`${fullGroups} заполнены`} />
              <StatCard
                label="Оплаты истекают ≤3 дней"
                value={expiring.length}
                tone={expiring.length > 0 ? "warning" : "success"}
              />
            </div>

            {expiring.length > 0 && (
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[var(--color-border)]">
                  <h2 className="text-sm font-semibold">Скоро истекает оплата</h2>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {expiring.map((p) => (
                      <tr key={p.id} className="border-b border-[var(--color-border)] last:border-0">
                        <td className="px-5 py-3 text-[var(--color-text-muted)]">
                          Ученик {p.student_id.slice(0, 8)}...
                        </td>
                        <td className="px-5 py-3 text-right font-medium">{p.amount}</td>
                        <td className="px-5 py-3 text-right text-[var(--color-warning)]">
                          до {p.valid_until}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number;
  sub?: string;
  tone?: "warning" | "success";
}) {
  const valueColor =
    tone === "warning" && value > 0
      ? "text-[var(--color-warning)]"
      : tone === "success"
        ? "text-[var(--color-success)]"
        : "text-[var(--color-text)]";

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
      <p className="text-sm text-[var(--color-text-muted)] mb-2">{label}</p>
      <p className={`text-3xl font-semibold tracking-tight ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-[var(--color-text-muted)] mt-1">{sub}</p>}
    </div>
  );
}
