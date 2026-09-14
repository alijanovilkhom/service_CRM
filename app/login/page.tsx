"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "неверный email или пароль");
        return;
      }
      const from = searchParams.get("from") || "/dashboard";
      router.replace(from.startsWith("/") ? from : "/dashboard");
      router.refresh();
    } catch {
      setError("неверный email или пароль");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink text-[#f6efe6] lg:flex lg:flex-col lg:justify-between p-12">
        <div className="font-display text-3xl">Atrium</div>
        <div>
          <h1 className="font-display text-5xl leading-tight">
            Заявки.
            <br />
            Клиенты.
            <br />
            Порядок.
          </h1>
          <p className="mt-6 max-w-sm text-[#cbbba8]">
            Канбан, задачи и аналитика в одном месте — без лишнего шума.
          </p>
        </div>
        <p className="text-sm text-[#8d7d6c]">Внутренняя CRM-система</p>
        <div className="pointer-events-none absolute -right-16 -bottom-16 h-72 w-72 rounded-full bg-copper/40 blur-3xl" />
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={onSubmit} className="card w-full max-w-md p-8">
          <div className="mb-6 lg:hidden">
            <div className="font-display text-2xl">Atrium</div>
          </div>
          <h2 className="font-display text-2xl">Вход</h2>
          <p className="mt-1 mb-6 text-sm text-muted">Введите email и пароль сотрудника</p>
          <label className="text-sm">
            Email
            <input
              className="input mt-1"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="mt-3 block text-sm">
            Пароль
            <input
              className="input mt-1"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
          <button className="btn btn-primary mt-5 w-full" disabled={loading}>
            {loading ? "Входим…" : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
