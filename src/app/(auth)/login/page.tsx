"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ошибка входа");
        setLoading(false);
        return;
      }

      // Cookie установлена сервером, делаем hard navigation
      window.location.href = params.get("callbackUrl") ?? "/dashboard";
    } catch {
      setError("Ошибка соединения");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4 shadow-lg">
            <span className="text-2xl text-secondary">✦</span>
          </div>
          <h1 className="text-2xl font-heading font-bold text-foreground tracking-tight">
            BeautyChief
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Платформа диагностики администраторов
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-8">
          <h2 className="text-lg font-heading font-semibold text-foreground mb-6">
            Войти в систему
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@beauty-school.ru"
                required
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-card text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Пароль
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-card text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm animate-fade-in">
                <span>⚠</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3"
            >
              {loading ? "Вход..." : "Войти"}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-border">
            <p className="text-xs text-muted-foreground text-center mb-3">
              Тестовые аккаунты:
            </p>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex justify-between px-3 py-1.5 bg-muted/50 rounded-lg">
                <span className="font-medium">Владелец</span>
                <span>owner@beauty-school.ru / password123</span>
              </div>
              <div className="flex justify-between px-3 py-1.5 bg-muted/50 rounded-lg">
                <span className="font-medium">Менеджер</span>
                <span>manager@beauty-school.ru / password123</span>
              </div>
              <div className="flex justify-between px-3 py-1.5 bg-muted/50 rounded-lg">
                <span className="font-medium">Администратор</span>
                <span>admin@beauty-school.ru / password123</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2026 BeautyChief
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin text-2xl text-primary">⟳</div></div>}>
      <LoginForm />
    </Suspense>
  );
}
