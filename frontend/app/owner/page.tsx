"use client";

import { useState, useEffect } from "react";
import { superApi, TenantInfo } from "@/lib/api";

export default function OwnerPage() {
  const [token, setToken] = useState("");
  const [inputToken, setInputToken] = useState("");
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("super_token");
    if (saved) { setToken(saved); load(saved); }
  }, []);

  async function load(t: string) {
    setLoading(true); setError("");
    try {
      const data = await superApi.listTenants(t);
      if (!Array.isArray(data)) throw new Error("Неверный токен");
      setTenants(data);
      localStorage.setItem("super_token", t);
    } catch {
      setError("Неверный токен. Убедись что в Railway у backend сервиса задана переменная SUPER_ADMIN_TOKEN");
    } finally { setLoading(false); }
  }

  async function handleToggle(id: string) {
    await superApi.toggle(token, id);
    await load(token);
  }

  const totalRevenue = tenants.reduce((s, t) => s + t.revenue_this_month, 0);
  const totalStudents = tenants.reduce((s, t) => s + t.active_students, 0);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="text-4xl mb-3">🔐</div>
            <h1 className="text-2xl font-semibold">Панель BotNest</h1>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">Только для владельца продукта</p>
          </div>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 space-y-4">
            {error && <div className="text-sm text-[var(--color-danger)] bg-[var(--color-danger-bg)] rounded-xl px-4 py-3">{error}</div>}
            <div>
              <label className="block text-sm font-medium mb-1.5">Super Admin Token</label>
              <input type="password" value={inputToken} onChange={e => setInputToken(e.target.value)}
                placeholder="Токен из переменных Railway"
                className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
            </div>
            <button onClick={() => { setToken(inputToken); load(inputToken); }} disabled={!inputToken}
              className="w-full rounded-xl bg-[var(--color-accent)] text-white text-sm font-semibold py-3 disabled:opacity-50">
              Войти
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">🚀 BotNest — EduCRM</h1>
          <p className="text-xs text-[var(--color-text-muted)]">Все учебные центры</p>
        </div>
        <button onClick={() => { localStorage.removeItem("super_token"); setToken(""); setTenants([]); }}
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-danger)]">
          Выйти
        </button>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-8">
        {loading ? <p className="text-sm text-[var(--color-text-muted)]">Загрузка...</p> : (<>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <div className="bg-[var(--color-accent)] text-white rounded-2xl p-4">
              <p className="text-xs opacity-80 mb-1">Центров</p>
              <p className="text-2xl font-bold">{tenants.length}</p>
            </div>
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4">
              <p className="text-xs text-[var(--color-text-muted)] mb-1">Активных учеников</p>
              <p className="text-2xl font-bold">{totalStudents}</p>
            </div>
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4">
              <p className="text-xs text-[var(--color-text-muted)] mb-1">Выручка (все центры)</p>
              <p className="text-2xl font-bold">{totalRevenue.toLocaleString("ru-RU")}</p>
            </div>
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4">
              <p className="text-xs text-[var(--color-text-muted)] mb-1">Заблокировано</p>
              <p className="text-2xl font-bold text-[var(--color-danger)]">{tenants.filter(t => !t.is_active).length}</p>
            </div>
          </div>

          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--color-border)]">
              <h2 className="text-sm font-semibold">Все учебные центры</h2>
            </div>
            {tenants.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] p-5">Центров пока нет. Зарегистрируй первый через /docs</p>
            ) : tenants.map(t => (
              <div key={t.id} className="px-5 py-4 border-b border-[var(--color-border)] last:border-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{t.name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-bg)] text-[var(--color-text-muted)]">{t.subdomain}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.plan === "pro" ? "bg-[var(--color-accent)] text-white" : "bg-[var(--color-bg)] text-[var(--color-text-muted)]"}`}>{t.plan}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1">
                      <span className="text-xs text-[var(--color-text-muted)]">📅 {t.created_at}</span>
                      {t.owner_email && <span className="text-xs text-[var(--color-text-muted)]">✉️ {t.owner_email}</span>}
                      <span className="text-xs text-[var(--color-text-muted)]">👥 {t.active_students} уч.</span>
                      {t.revenue_this_month > 0 && <span className="text-xs text-[var(--color-success)]">💰 {t.revenue_this_month.toLocaleString("ru-RU")}</span>}
                    </div>
                  </div>
                  <button onClick={() => handleToggle(t.id)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors ${t.is_active ? "bg-[var(--color-success-bg)] text-[var(--color-success)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]" : "bg-[var(--color-danger-bg)] text-[var(--color-danger)] hover:bg-[var(--color-success-bg)] hover:text-[var(--color-success)]"}`}>
                    {t.is_active ? "Активен" : "Заблокирован"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>)}
      </main>
    </div>
  );
}
