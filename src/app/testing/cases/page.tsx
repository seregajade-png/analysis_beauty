"use client";

import { useState, useEffect } from "react";
import { getScoreBg, getScoreLabel } from "@/lib/utils";
import type { TestAnalysisResult } from "@/types";

interface PracticalCase {
  id: string;
  title: string;
  description: string;
  scenario: string;
  difficulty: number;
}

export default function CasesPage() {
  const [cases, setCases] = useState<PracticalCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<PracticalCase | null>(null);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestAnalysisResult | null>(null);

  useEffect(() => {
    fetch("/api/testing/cases")
      .then((r) => r.json())
      .then((data) => {
        setCases(data);
        if (data.length > 0) setSelectedCase(data[0]);
      });
  }, []);

  async function handleSubmit() {
    if (!response.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/testing/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: selectedCase?.id, response }),
      });
      const data = await res.json();
      setResult(data.result);
    } catch {
      alert("Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero Banner — Warm Glassmorphism */}
      <div className="relative rounded-2xl p-10 pb-16 mb-6 overflow-hidden hero-banner-warm">
        <div className="glass-card p-8 relative z-10 max-w-2xl">
          <h1 className="heading-display text-2xl lg:text-3xl text-white flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">◈</span>
            Практические кейсы
          </h1>
          <p className="text-white/70 text-sm mt-2">
            Прочитайте ситуацию и напишите полный диалог — AI оценит вашу работу
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Левая панель */}
        <div className="lg:col-span-2 space-y-4">
          {/* Выбор кейса */}
          {cases.length > 1 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Выберите кейс</p>
              <div className="space-y-1.5">
                {cases.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedCase(c); setResult(null); setResponse(""); }}
                    className={`w-full text-left p-3 rounded-xl border text-sm transition-all ${
                      selectedCase?.id === c.id
                        ? "border-primary bg-mint/20 text-primary font-medium"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{c.title}</span>
                      <span className="text-xs opacity-60">
                        {"★".repeat(c.difficulty)}{"☆".repeat(3 - c.difficulty)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Кейс */}
          {selectedCase && (
            <div className="relative rounded-2xl p-6 pb-10 overflow-hidden hero-banner-warm">
              <div className="glass-card p-5 relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/60">Ситуация</span>
                  <span className="text-xs text-white/50">{"★".repeat(selectedCase.difficulty)}</span>
                </div>
                <h3 className="font-bold text-lg mb-2 text-white">{selectedCase.title}</h3>
                <p className="text-sm text-white/70 leading-relaxed">{selectedCase.scenario}</p>
              </div>
            </div>
          )}

          {!result ? (
            <>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Ваш ответ — напишите полный диалог
                </label>
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder={"Вы: Салон красоты «Название», администратор Анна, добрый день!\nКлиент: Здравствуйте, я хотела бы...\nВы: ..."}
                  rows={12}
                  className="w-full px-3 py-2.5 rounded-xl border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {response.length} символов · рекомендуется минимум 200
                </p>
              </div>
              <button
                onClick={handleSubmit}
                disabled={loading || response.length < 50}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary/80 text-white font-semibold text-sm transition-all disabled:opacity-40"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⟳</span> AI оценивает...
                  </span>
                ) : (
                  "Отправить на проверку"
                )}
              </button>
            </>
          ) : (
            <button
              onClick={() => { setResult(null); setResponse(""); }}
              className="w-full py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-all"
            >
              ← Пройти снова
            </button>
          )}
        </div>

        {/* Результат */}
        <div className="lg:col-span-3">
          {result ? (
            <div className="space-y-4 animate-fade-in">
              {/* Оценка */}
              <div className={`p-5 rounded-2xl border ${getScoreBg(result.score)}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider opacity-70">Оценка кейса</p>
                    <p className="text-4xl font-bold mt-1">{result.score}<span className="text-xl">/10</span></p>
                    <p className="text-sm font-medium mt-0.5">{getScoreLabel(result.score)}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="text-xs"><span className="opacity-60">Структура: </span><span className="font-bold">{result.structureScore}/10</span></div>
                    <div className="text-xs"><span className="opacity-60">Содержание: </span><span className="font-bold">{result.contentScore}/10</span></div>
                  </div>
                </div>
                <p className="text-sm mt-3 opacity-80">{result.feedback}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {result.strengths?.length > 0 && (
                  <div className="card-salon p-4">
                    <h3 className="text-sm font-semibold text-primary mb-2">✦ Сильные стороны</h3>
                    <ul className="space-y-1">
                      {result.strengths.map((s, i) => (
                        <li key={i} className="text-xs text-foreground flex gap-1.5">
                          <span className="text-primary flex-shrink-0">✓</span>{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.weaknesses?.length > 0 && (
                  <div className="card-salon p-4">
                    <h3 className="text-sm font-semibold text-red-600 mb-2">⚠ Что упущено</h3>
                    <ul className="space-y-1">
                      {result.weaknesses.map((w, i) => (
                        <li key={i} className="text-xs text-foreground flex gap-1.5">
                          <span className="text-red-500 flex-shrink-0">✕</span>{w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {result.detailedAnalysis && (
                <div className="card-salon p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-2">Детальный разбор</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                    {result.detailedAnalysis}
                  </p>
                </div>
              )}

              {result.recommendations?.length > 0 && (
                <div className="card-salon p-4">
                  <h3 className="text-sm font-semibold text-secondary mb-3">◈ Рекомендации</h3>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="w-5 h-5 rounded-full bg-secondary text-white text-xs flex items-center justify-center flex-shrink-0">{i + 1}</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-center p-12 bg-muted/30 rounded-2xl border border-dashed border-border">
              <div>
                <div className="text-5xl mb-4 opacity-30">◈</div>
                <p className="text-muted-foreground text-sm">
                  Напишите ответ на кейс и нажмите «Отправить»
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
