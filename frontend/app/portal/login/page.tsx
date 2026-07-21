"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { studentApi, ApiError } from "@/lib/studentApi";

export default function StudentLoginPage() {
  const router = useRouter();
  const [subdomain, setSubdomain] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { access_token } = await studentApi.login(subdomain, phone, password);
      localStorage.setItem("student_access_token", access_token);
      router.push("/portal");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось войти. Спросите пароль у администратора.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Мой кабинет</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Вход для учеников</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 space-y-4"
        >
          {error && (
            <div className="text-sm text-[var(--color-danger)] bg-[var(--color-danger-bg)] rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Subdomain центра</label>
            <input
              required
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value)}
              placeholder="my-center"
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Телефон</label>
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+998..."
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Пароль</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium py-2.5 hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
          >
            {loading ? "Входим..." : "Войти"}
          </button>
          <p className="text-xs text-center text-[var(--color-text-muted)]">
            Пароль выдаёт администратор учебного центра
          </p>
        </form>
      </div>
    </div>
  );
}
