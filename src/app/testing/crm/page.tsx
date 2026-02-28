"use client";

import { useState, useEffect } from "react";
import { getScoreBg, getScoreLabel } from "@/lib/utils";
import type { CRMTestAnalysisResult } from "@/types";

interface CRMQuestion {
  id: string;
  question: string;
  category?: string;
  order: number;
}

export default function CRMTestPage() {
  const [questions, setQuestions] = useState<CRMQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"test" | "result">("test");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CRMTestAnalysisResult | null>(null);

  useEffect(() => {
    fetch("/api/testing/crm")
      .then((r) => r.json())
      .then((data) => {
        setQuestions(data);
        const init: Record<string, string> = {};
        data.forEach((q: CRMQuestion) => { init[q.id] = ""; });
        setAnswers(init);
      });
  }, []);

  async function handleSubmit() {
    setLoading(true);
    try {
      const qa = questions.map((q) => ({
        question: q.question,
        answer: answers[q.id] ?? "",
      }));

      const res = await fetch("/api/testing/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: qa }),
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

  const allAnswered = questions.every((q) => (answers[q.id] ?? "").trim().length > 10);

  // Группируем по категориям
  const grouped = questions.reduce((acc, q) => {
    const cat = q.category ?? "Общие";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(q);
    return acc;
  }, {} as Record<string, CRMQuestion[]>);

  if (step === "test") {
    return (
      <div className="max-w-4xl mx-auto">
        {/* Hero Banner — Orange Glassmorphism */}
        <div className="relative rounded-2xl p-10 pb-16 mb-6 overflow-hidden hero-banner-orange">
          <div className="glass-card p-8 relative z-10 max-w-2xl">
            <h1 className="heading-display text-2xl lg:text-3xl text-white flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">⊕</span>
              Тест на работу с CRM
            </h1>
            <p className="text-white/70 text-sm mt-2">
              Ответьте на вопросы о работе с клиентской базой — AI оценит системность и полноту подхода
            </p>
          </div>
        </div>

        {questions.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="text-5xl mb-4 opacity-30">⊕</div>
            <p>Вопросы не настроены</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([category, qs]) => (
              <div key={category}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <h2 className="text-sm font-semibold font-heading text-foreground uppercase tracking-wider">
                    {category}
                  </h2>
                </div>
                <div className="space-y-4">
                  {qs.map((q, i) => (
                    <div key={q.id} className="card-salon p-5">
                      <div className="flex items-start gap-3 mb-3">
                        <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </span>
                        <p className="text-sm font-medium text-foreground">{q.question}</p>
                      </div>
                      <textarea
                        value={answers[q.id] ?? ""}
                        onChange={(e) =>
                          setAnswers((p) => ({ ...p, [q.id]: e.target.value }))
                        }
                        placeholder="Ваш ответ..."
                        rows={4}
                        className="w-full px-3 py-2.5 rounded-xl border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <button
              onClick={handleSubmit}
              disabled={loading || !allAnswered}
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary/80 text-white font-semibold text-sm transition-all disabled:opacity-40 shadow-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⟳</span> Оцениваю знания CRM...
                </span>
              ) : (
                "Проверить знания CRM"
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (step === "result" && result) {
    return (
      <div className="p-6 max-w-4xl mx-auto animate-fade-in">
        <button
          onClick={() => { setStep("test"); setResult(null); setAnswers({}); }}
          className="text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          ← Пройти снова
        </button>

        <h1 className="text-2xl font-bold font-heading text-foreground mb-6">
          Результаты теста CRM
        </h1>

        <div className={`p-6 rounded-2xl border mb-6 ${getScoreBg(result.score)}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-wider opacity-70">Общая оценка</p>
              <p className="text-5xl font-bold">{result.score}<span className="text-2xl">/10</span></p>
              <p className="text-base font-medium mt-1">{getScoreLabel(result.score)}</p>
            </div>
            <div className="space-y-2">
              <div className="p-3 bg-white/50 rounded-xl text-center">
                <p className="text-2xl font-bold">{result.completenessScore}/10</p>
                <p className="text-xs opacity-70">Полнота</p>
              </div>
              <div className="p-3 bg-white/50 rounded-xl text-center">
                <p className="text-2xl font-bold">{result.systematicScore}/10</p>
                <p className="text-xs opacity-70">Системность</p>
              </div>
            </div>
          </div>
          <p className="text-sm opacity-80">{result.feedback}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {result.strengths?.length > 0 && (
            <div className="card-salon p-4">
              <h3 className="text-sm font-semibold text-primary mb-2">✦ Сильные стороны</h3>
              <ul className="space-y-1">
                {result.strengths.map((s, i) => (
                  <li key={i} className="text-xs flex gap-1.5"><span className="text-primary">✓</span>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {result.weakAreas?.length > 0 && (
            <div className="card-salon p-4">
              <h3 className="text-sm font-semibold text-red-600 mb-2">⚠ Что улучшить</h3>
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
            <h3 className="text-sm font-semibold mb-3">Детальный разбор ответов</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
              {result.detailedAnalysis}
            </p>
          </div>
        )}

        {result.recommendations?.length > 0 && (
          <div className="card-salon p-5">
            <h3 className="text-sm font-semibold text-primary mb-3">⊕ Рекомендации по CRM</h3>
            <ul className="space-y-2">
              {result.recommendations.map((r, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center flex-shrink-0">{i + 1}</span>
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
