"use client";

import { useState, useEffect } from "react";
import { formatDate } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock, Sparkles } from "lucide-react";

interface AccessInfo {
  hasAccess: boolean;
  status: "TRIAL" | "ACTIVE" | "EXPIRED";
  callsRemaining: number;
  chatsRemaining: number;
  callsLimit: number;
  chatsLimit: number;
  trialEndsAt?: string | null;
  subscriptionEndsAt?: string | null;
}

interface PaymentRequest {
  id: string;
  amount: number;
  months: number;
  status: "PENDING" | "CONFIRMED" | "REJECTED";
  createdAt: string;
}

export default function SubscriptionPage() {
  const [access, setAccess] = useState<AccessInfo | null>(null);
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [price, setPrice] = useState(2490);
  const [months, setMonths] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  async function load() {
    const res = await fetch("/api/subscription");
    if (res.ok) {
      const data = await res.json();
      setAccess(data.access);
      setRequests(data.requests);
      setPrice(data.price);
    }
  }

  useEffect(() => { load(); }, []);

  async function createRequest() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ months }),
      });
      if (res.ok) {
        setShowInstructions(true);
        await load();
      }
    } finally {
      setSubmitting(false);
    }
  }

  const total = price * months;

  const statusInfo = access?.status === "ACTIVE"
    ? { label: "Активна", color: "text-green-600 bg-green-50 border-green-200", icon: CheckCircle2 }
    : access?.status === "TRIAL"
    ? { label: "Пробный период", color: "text-blue-600 bg-blue-50 border-blue-200", icon: Sparkles }
    : { label: "Истекла", color: "text-red-600 bg-red-50 border-red-200", icon: XCircle };

  const StatusIcon = statusInfo.icon;
  const expiresAt = access?.status === "ACTIVE" ? access.subscriptionEndsAt : access?.trialEndsAt;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero */}
      <div className="relative rounded-2xl p-6 md:p-10 mb-6 overflow-hidden hero-banner">
        <div className="glass-card p-5 md:p-8 relative z-10 max-w-2xl">
          <h1 className="heading-display text-xl md:text-2xl lg:text-3xl text-white flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">★</span>
            Подписка
          </h1>
          <p className="text-white/70 text-sm mt-2">
            Управление подпиской и лимитами анализов
          </p>
        </div>
      </div>

      {/* Текущий статус */}
      {access && (
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className={`p-5 rounded-2xl border ${statusInfo.color}`}>
            <div className="flex items-center gap-2 mb-2">
              <StatusIcon size={18} />
              <p className="text-xs font-semibold uppercase tracking-wider">Статус</p>
            </div>
            <p className="text-xl font-bold">{statusInfo.label}</p>
            {expiresAt && (
              <p className="text-xs mt-1 opacity-80">
                до {formatDate(expiresAt)}
              </p>
            )}
          </div>

          <div className="p-5 rounded-2xl border bg-card border-border">
            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
              <Clock size={18} />
              <p className="text-xs font-semibold uppercase tracking-wider">Звонки сегодня</p>
            </div>
            <p className="text-xl font-bold text-foreground">
              {access.callsRemaining} <span className="text-sm text-muted-foreground">/ {access.callsLimit}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">осталось анализов</p>
          </div>

          <div className="p-5 rounded-2xl border bg-card border-border">
            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
              <Clock size={18} />
              <p className="text-xs font-semibold uppercase tracking-wider">Переписки сегодня</p>
            </div>
            <p className="text-xl font-bold text-foreground">
              {access.chatsRemaining} <span className="text-sm text-muted-foreground">/ {access.chatsLimit}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">осталось анализов</p>
          </div>
        </div>
      )}

      {/* План подписки */}
      <div className="card-salon p-6 md:p-8 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="heading-display text-2xl text-foreground">Полная подписка</h2>
            <p className="text-sm text-muted-foreground mt-1">Расширенные лимиты для активной работы</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-primary">{price.toLocaleString("ru")} ₽</p>
            <p className="text-xs text-muted-foreground">в месяц</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          {[
            "20 анализов звонков в день",
            "20 анализов переписок в день",
            "Все тесты администратора",
            "История всех анализов",
            "AI-карточка администратора",
            "Экспорт результатов в PDF",
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-2 text-sm text-foreground">
              <CheckCircle2 size={16} className="text-primary shrink-0" />
              {feature}
            </div>
          ))}
        </div>

        {/* Месяцы */}
        <div className="mb-4">
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Период оплаты</label>
          <div className="flex gap-2 flex-wrap">
            {[1, 3, 6, 12].map((m) => (
              <button
                key={m}
                onClick={() => setMonths(m)}
                className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                  months === m
                    ? "border-primary bg-mint/20 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {m === 1 ? "1 месяц" : m === 12 ? "1 год" : `${m} мес.`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-mint/20 border border-primary/20 mb-4">
          <span className="text-sm font-medium text-foreground">К оплате:</span>
          <span className="text-2xl font-bold text-primary">{total.toLocaleString("ru")} ₽</span>
        </div>

        <button
          onClick={createRequest}
          disabled={submitting}
          className="w-full btn-primary py-3 disabled:opacity-50"
        >
          {submitting ? "Создаём заявку..." : "Оформить подписку"}
        </button>
      </div>

      {/* Инструкция после создания заявки */}
      {showInstructions && (
        <div className="card-salon p-6 mb-6 border-2 border-primary animate-fade-in">
          <h3 className="text-lg font-heading font-semibold text-primary mb-3">
            ✓ Заявка создана
          </h3>
          <p className="text-sm text-foreground mb-4">
            Чтобы активировать подписку, выполните оплату по реквизитам ниже и сообщите администратору в Telegram.
          </p>
          <div className="space-y-2 p-4 rounded-xl bg-muted text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Сумма:</span>
              <span className="font-bold text-foreground">{total.toLocaleString("ru")} ₽</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Период:</span>
              <span className="text-foreground">{months} мес.</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Получатель:</span>
              <span className="text-foreground">BeautyChief</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Telegram:</span>
              <a href="https://t.me/beautychief_admin" target="_blank" className="text-primary underline">
                @beautychief_admin
              </a>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            После подтверждения оплаты администратором ваша подписка будет активирована автоматически.
          </p>
        </div>
      )}

      {/* История заявок */}
      {requests.length > 0 && (
        <div className="card-salon p-6">
          <h3 className="text-sm font-heading font-semibold text-foreground mb-4">История заявок</h3>
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted text-sm">
                <div>
                  <p className="font-medium text-foreground">
                    {r.amount.toLocaleString("ru")} ₽ · {r.months} мес.
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                  r.status === "CONFIRMED" ? "bg-green-50 border-green-200 text-green-700" :
                  r.status === "REJECTED" ? "bg-red-50 border-red-200 text-red-700" :
                  "bg-yellow-50 border-yellow-200 text-yellow-700"
                }`}>
                  {r.status === "CONFIRMED" ? "Оплачено" :
                   r.status === "REJECTED" ? "Отклонено" : "Ожидает оплаты"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
