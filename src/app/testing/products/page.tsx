"use client";

import { useState, useEffect } from "react";
import { getScoreBg, getScoreLabel } from "@/lib/utils";
import type { ProductTestAnalysisResult } from "@/types";

interface Product {
  id: string;
  name: string;
  category?: string;
  characteristics: string;
  advantages: string;
  benefits: string;
  price?: number;
  targetAudience?: string;
  objections?: Record<string, string>;
}

const QUESTIONS = [
  { key: "characteristics", label: "Что входит в состав / как работает процедура?", hint: "Характеристики" },
  { key: "benefits", label: "Как объясните клиенту, зачем ей эта процедура? Ответьте на языке выгод.", hint: "Выгоды" },
  { key: "objection_expensive", label: "Клиент говорит «дорого» — ваш ответ:", hint: "Возражение «дорого»" },
  { key: "target_audience", label: "Кому бы вы рекомендовали эту процедуру и почему?", hint: "Целевая аудитория" },
];

export default function ProductsTestPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"select" | "test" | "result">("select");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProductTestAnalysisResult | null>(null);

  useEffect(() => {
    fetch("/api/testing/products")
      .then((r) => r.json())
      .then((data) => setProducts(data));
  }, []);

  function startTest(product: Product) {
    setSelected(product);
    setAnswers({});
    setStep("test");
  }

  async function handleSubmit() {
    if (!selected) return;
    setLoading(true);
    try {
      const qa = QUESTIONS.map((q) => ({
        question: q.label,
        answer: answers[q.key] ?? "",
      }));

      const res = await fetch("/api/testing/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selected.id, answers: qa }),
      });
      const data = await res.json();
      setResult(data.result);
      setStep("result");
    } catch {
      alert("Ошибка");
    } finally {
      setLoading(false);
    }
  }

  const allAnswered = QUESTIONS.every((q) => (answers[q.key] ?? "").trim().length > 20);

  if (step === "select") {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold font-heading text-foreground flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white">◎</span>
            Тест на знание продуктов (ХПВ)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Выберите услугу и ответьте на 4 вопроса — AI проверит знание характеристик, выгод и работы с возражениями
          </p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="text-5xl mb-4 opacity-30">◎</div>
            <p className="font-medium">Продукты не добавлены</p>
            <p className="text-sm mt-1">Владелец школы должен добавить продукты в настройках</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => startTest(p)}
                className="card-salon p-5 text-left hover:border-secondary/50 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-foreground group-hover:text-secondary transition-colors">
                      {p.name}
                    </p>
                    {p.category && (
                      <p className="text-xs text-muted-foreground mt-0.5">{p.category}</p>
                    )}
                  </div>
                  {p.price && (
                    <span className="text-sm font-bold text-secondary">
                      {p.price.toLocaleString("ru")} ₽
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{p.benefits}</p>
                <div className="mt-3 text-xs text-secondary font-medium group-hover:gap-2 transition-all">
                  Пройти тест →
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (step === "test" && selected) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <button onClick={() => setStep("select")} className="text-sm text-muted-foreground hover:text-foreground mb-3 flex items-center gap-1">
            ← Выбрать другой продукт
          </button>
          <div className="hero-banner rounded-2xl relative z-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Тест на знание продукта</p>
            <h2 className="text-xl font-bold font-heading text-foreground">{selected.name}</h2>
            {selected.price && <p className="text-sm text-muted-foreground mt-0.5">{selected.price.toLocaleString("ru")} ₽</p>}
          </div>
        </div>

        <div className="space-y-5">
          {QUESTIONS.map((q, i) => (
            <div key={q.key} className="card-salon p-5">
              <div className="flex items-start gap-3 mb-3">
                <span className="w-6 h-6 rounded-full bg-secondary text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{q.label}</p>
                  <p className="text-xs text-secondary mt-0.5">{q.hint}</p>
                </div>
              </div>
              <textarea
                value={answers[q.key] ?? ""}
                onChange={(e) => setAnswers((p) => ({ ...p, [q.key]: e.target.value }))}
                placeholder="Ваш ответ..."
                rows={4}
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          ))}

          <button
            onClick={handleSubmit}
            disabled={loading || !allAnswered}
            className="w-full py-3 rounded-xl bg-primary hover:bg-primary/80 text-white font-semibold text-sm transition-all disabled:opacity-40 shadow-sm"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⟳</span> Проверяю знания...
              </span>
            ) : (
              "Проверить знания"
            )}
          </button>
          {!allAnswered && (
            <p className="text-xs text-center text-muted-foreground">
              Ответьте на все вопросы (минимум 20 символов каждый)
            </p>
          )}
        </div>
      </div>
    );
  }

  if (step === "result" && result) {
    return (
      <div className="p-6 max-w-4xl mx-auto animate-fade-in">
        <div className="mb-6">
          <button onClick={() => { setStep("select"); setResult(null); }} className="text-sm text-muted-foreground hover:text-foreground mb-3">
            ← Пройти другой тест
          </button>
          <h1 className="text-2xl font-bold font-heading text-foreground">Результаты теста: {selected?.name}</h1>
        </div>

        {/* Общая оценка */}
        <div className={`p-6 rounded-2xl border mb-6 ${getScoreBg(result.score)}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-wider opacity-70">Общая оценка</p>
              <p className="text-5xl font-bold">{result.score}<span className="text-2xl">/10</span></p>
              <p className="text-base font-medium mt-1">{getScoreLabel(result.score)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Знание продукта", val: result.knowledgeScore },
                { label: "Презентация выгод", val: result.benefitsPresentationScore },
                { label: "Работа с возражениями", val: result.objectionHandlingScore },
                { label: "Знание ЦА", val: result.targetAudienceScore },
              ].map((item) => (
                <div key={item.label} className="text-center p-2 bg-white/50 rounded-xl">
                  <p className="text-lg font-bold">{item.val}/10</p>
                  <p className="text-xs opacity-70">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-sm opacity-80">{result.feedback}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {result.strengths?.length > 0 && (
            <div className="card-salon p-4">
              <h3 className="text-sm font-semibold text-primary mb-2">✦ Знаете хорошо</h3>
              <ul className="space-y-1">
                {result.strengths.map((s, i) => (
                  <li key={i} className="text-xs flex gap-1.5"><span className="text-primary">✓</span>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {result.weakAreas?.length > 0 && (
            <div className="card-salon p-4">
              <h3 className="text-sm font-semibold text-red-600 mb-2">⚠ Пробелы</h3>
              <ul className="space-y-1">
                {result.weakAreas.map((w, i) => (
                  <li key={i} className="text-xs flex gap-1.5"><span className="text-red-500">✕</span>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {result.detailedAnalysis && (
          <div className="card-salon p-5 mb-4">
            <h3 className="text-sm font-semibold mb-3">Детальный разбор</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
              {result.detailedAnalysis}
            </p>
          </div>
        )}

        {result.recommendations?.length > 0 && (
          <div className="card-salon p-5">
            <h3 className="text-sm font-semibold text-secondary mb-3">◈ Что изучить</h3>
            <ul className="space-y-2">
              {result.recommendations.map((r, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="w-5 h-5 rounded-full bg-secondary text-white text-xs flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return null;
}
