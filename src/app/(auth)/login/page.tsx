"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Неверный email или пароль");
      setLoading(false);
    } else {
      router.push(params.get("callbackUrl") ?? "/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Логотип / заголовок */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-orange to-brand-orange-light mb-4 shadow-lg">
            <span className="text-2xl">✦</span>
          </div>
          <h1 className="text-2xl font-bold text-brand-dark tracking-tight">
            Beauty Call Analyzer
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Платформа диагностики администраторов
          </p>
        </div>

        {/* Форма */}
        <div className="bg-white rounded-2xl shadow-sm border border-border p-8">
          <h2 className="text-lg font-semibold text-brand-dark mb-6">
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
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange
                           transition-all"
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
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange
                           transition-all"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
                <span>⚠</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-brand-orange hover:bg-brand-orange-dark
                         text-white font-semibold text-sm transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed
                         shadow-sm hover:shadow-md"
            >
              {loading ? "Вход..." : "Войти"}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-border">
            <p className="text-xs text-muted-foreground text-center mb-3">
              Тестовые аккаунты:
            </p>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex justify-between px-3 py-1.5 bg-muted rounded-lg">
                <span className="font-medium">Владелец</span>
                <span>owner@beauty-school.ru / password123</span>
              </div>
              <div className="flex justify-between px-3 py-1.5 bg-muted rounded-lg">
                <span className="font-medium">Менеджер</span>
                <span>manager@beauty-school.ru / password123</span>
              </div>
              <div className="flex justify-between px-3 py-1.5 bg-muted rounded-lg">
                <span className="font-medium">Администратор</span>
                <span>admin@beauty-school.ru / password123</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2025 Beauty Call Analyzer
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-brand-cream flex items-center justify-center"><div className="animate-spin text-2xl">⟳</div></div>}>
      <LoginForm />
    </Suspense>
  );
}
