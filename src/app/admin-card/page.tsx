"use client";

import { useState, useEffect } from "react";
import { formatScore, getScoreBg, getScoreLabel, formatDate } from "@/lib/utils";
import type { AdminSkill, DevelopmentItem } from "@/types";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface AdminCard {
  id: string;
  adminName: string;
  salonName?: string;
  overallScore?: number;
  skills: AdminSkill[];
  testSummary?: {
    practicalCase?: { score: number; feedback: string };
    roleplay?: { score: number; fearLevel: string; feedback: string };
    productKnowledge?: { score: number; weakAreas: string[] };
    crmKnowledge?: { score: number; feedback: string };
  };
  developmentPlan?: DevelopmentItem[];
  callSummary?: { totalCalls: number; avgScore: number };
  chatSummary?: { totalChats: number; avgScore: number };
  isShared?: boolean;
  shareToken?: string;
  createdAt: string;
}

const FEAR_LABELS: Record<string, string> = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
};

export default function AdminCardPage() {
  const [card, setCard] = useState<AdminCard | null>(null);
  const [history, setHistory] = useState<AdminCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "skills" | "plan">("overview");

  useEffect(() => {
    fetch("/api/admin-card")
      .then((r) => r.json())
      .then((data: AdminCard[]) => {
        setHistory(data);
        if (data.length > 0) setCard(data[0]);
      });
  }, []);

  async function generateCard() {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin-card", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json();
      setCard(data.card);
      const updated = await fetch("/api/admin-card").then((r) => r.json());
      setHistory(updated);
    } catch {
      alert("Ошибка генерации");
    } finally {
      setGenerating(false);
    }
  }

  async function toggleShare() {
    if (!card) return;
    const res = await fetch("/api/admin-card", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: card.id, share: !card.isShared }),
    });
    const data = await res.json();
    setShareUrl(data.shareUrl);
    setCard((c) => c ? { ...c, isShared: !c.isShared, shareToken: data.shareToken } : c);
  }

  function exportPDF() {
    if (!card) return;
    import("jspdf").then(({ jsPDF }) => {
      const doc = new jsPDF();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text(`Карточка администратора: ${card.adminName}`, 20, 20);
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Дата: ${formatDate(card.createdAt)}`, 20, 32);
      doc.text(`Общая оценка: ${formatScore(card.overallScore ?? null)}/10`, 20, 42);

      if (card.skills?.length) {
        doc.setFont("helvetica", "bold");
        doc.text("Навыки:", 20, 56);
        doc.setFont("helvetica", "normal");
        card.skills.forEach((skill, i) => {
          doc.text(`${skill.name}: ${skill.score}/10 — ${skill.details}`, 25, 66 + i * 10);
        });
      }

      doc.save(`admin_card_${card.adminName.replace(/\s/g, "_")}.pdf`);
    });
  }

  const radarData = card?.skills?.map((s) => ({
    skill: s.name.length > 15 ? s.name.substring(0, 15) + "…" : s.name,
    value: s.score,
    fullMark: 10,
  })) ?? [];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white">◉</span>
            Карточка администратора
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Сводная оценка навыков на основе всех проведённых анализов и тестов
          </p>
        </div>

        {/* Действия */}
        <div className="flex items-center gap-2">
          {history.length > 1 && (
            <select
              onChange={(e) => {
                const found = history.find((h) => h.id === e.target.value);
                if (found) setCard(found);
              }}
              className="px-3 py-2 rounded-xl border border-border text-sm focus:outline-none"
            >
              {history.map((h, i) => (
                <option key={h.id} value={h.id}>
                  {i === 0 ? "Последняя" : formatDate(h.createdAt)}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={generateCard}
            disabled={generating}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/80 text-white text-sm font-medium transition-all disabled:opacity-40"
          >
            {generating ? "⟳ Генерирую..." : "⟳ Обновить"}
          </button>
          {card && (
            <>
              <button
                onClick={exportPDF}
                className="px-4 py-2 rounded-xl border border-border text-sm hover:bg-muted transition-all"
              >
                ↓ PDF
              </button>
              <button
                onClick={toggleShare}
                className={`px-4 py-2 rounded-xl border text-sm transition-all ${
                  card.isShared
                    ? "border-primary bg-mint/20 text-primary"
                    : "border-border hover:bg-muted"
                }`}
              >
                {card.isShared ? "✓ Ссылка активна" : "⇗ Поделиться"}
              </button>
            </>
          )}
        </div>
      </div>

      {shareUrl && (
        <div className="mb-4 p-3 rounded-xl bg-mint/20 border border-primary/20 flex items-center justify-between">
          <span className="text-sm text-primary font-medium">Ссылка для просмотра:</span>
          <a href={shareUrl} target="_blank" className="text-sm text-primary underline truncate max-w-xs">
            {shareUrl}
          </a>
          <button
            onClick={() => navigator.clipboard.writeText(shareUrl)}
            className="text-xs text-primary hover:underline ml-2"
          >
            Копировать
          </button>
        </div>
      )}

      {!card ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4 opacity-30">◉</div>
          <p className="text-muted-foreground mb-4">Карточка ещё не создана</p>
          <button
            onClick={generateCard}
            disabled={generating}
            className="px-6 py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/80 transition-all disabled:opacity-40"
          >
            {generating ? "⟳ Генерирую..." : "Создать карточку"}
          </button>
          <p className="text-xs text-muted-foreground mt-3">
            AI проанализирует все ваши результаты и составит карточку
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Левая панель */}
          <div className="lg:col-span-1 space-y-4">
            {/* Профиль */}
            <div className="hero-banner rounded-2xl relative z-0">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                  {card.adminName[0]}
                </div>
                <div>
                  <p className="font-bold text-lg text-foreground">{card.adminName}</p>
                  {card.salonName && <p className="text-sm text-muted-foreground">{card.salonName}</p>}
                  <p className="text-xs text-muted-foreground">{formatDate(card.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Общая оценка</p>
                  <p className="text-4xl font-bold text-foreground">
                    {formatScore(card.overallScore ?? null)}
                    <span className="text-xl text-muted-foreground">/10</span>
                  </p>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{getScoreLabel(card.overallScore ?? 0)}</p>
                  {card.callSummary && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {card.callSummary.totalCalls} звонков · ср. {formatScore(card.callSummary.avgScore)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Результаты тестов */}
            {card.testSummary && (
              <div className="card-salon p-4 space-y-2">
                <h3 className="text-sm font-semibold mb-3">Результаты тестов</h3>
                {card.testSummary.practicalCase && (
                  <TestRow label="Практический кейс" score={card.testSummary.practicalCase.score} />
                )}
                {card.testSummary.roleplay && (
                  <TestRow
                    label="Ролевая игра"
                    score={card.testSummary.roleplay.score}
                    sub={`Страх: ${FEAR_LABELS[card.testSummary.roleplay.fearLevel] ?? card.testSummary.roleplay.fearLevel}`}
                  />
                )}
                {card.testSummary.productKnowledge && (
                  <TestRow label="Знание продуктов" score={card.testSummary.productKnowledge.score} />
                )}
                {card.testSummary.crmKnowledge && (
                  <TestRow label="CRM" score={card.testSummary.crmKnowledge.score} />
                )}
              </div>
            )}

            {/* Радарная диаграмма */}
            {radarData.length > 0 && (
              <div className="card-salon p-4">
                <h3 className="text-sm font-semibold mb-3">Профиль навыков</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis
                      dataKey="skill"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Radar
                      name="Оценка"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                    <Tooltip formatter={(val) => [`${val}/10`, "Оценка"]} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Правая панель */}
          <div className="lg:col-span-2 space-y-4">
            {/* Табы */}
            <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
              {(["overview", "skills", "plan"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === t ? "bg-white text-primary shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  {t === "overview" ? "Обзор" : t === "skills" ? "Навыки" : "План развития"}
                </button>
              ))}
            </div>

            {activeTab === "overview" && card.skills && (
              <div className="space-y-3">
                {card.skills.map((skill) => (
                  <div key={skill.key} className={`p-4 rounded-2xl border ${getScoreBg(skill.score)}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold">{skill.name}</span>
                      <span className="text-lg font-bold">{skill.score}/10</span>
                    </div>
                    <div className="w-full bg-black/10 rounded-full h-1.5 mb-2">
                      <div
                        className="h-1.5 rounded-full bg-current opacity-60 transition-all"
                        style={{ width: `${skill.score * 10}%` }}
                      />
                    </div>
                    <p className="text-xs opacity-80">{skill.details}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "skills" && card.skills && (
              <div className="space-y-4">
                {card.skills.map((skill) => (
                  <div key={skill.key} className="card-salon p-5">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-foreground">{skill.name}</h3>
                      <span className={`text-sm font-bold px-2.5 py-1 rounded-lg border ${getScoreBg(skill.score)}`}>
                        {skill.score}/10
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{skill.details}</p>
                    {skill.recommendations?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-secondary mb-1.5">Рекомендации:</p>
                        <ul className="space-y-1">
                          {skill.recommendations.map((r, i) => (
                            <li key={i} className="text-xs flex gap-1.5 text-muted-foreground">
                              <span className="text-secondary flex-shrink-0">→</span>{r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === "plan" && card.developmentPlan && (
              <div className="space-y-3">
                {card.developmentPlan.map((item, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-2xl border ${
                      i === 0
                        ? "bg-muted border-secondary/30"
                        : "card-salon"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          i === 0
                            ? "bg-secondary text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {item.priority}
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-foreground">{item.skill}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{item.action}</p>
                        <p className="text-xs text-secondary font-medium mt-1.5">⏱ {item.deadline}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TestRow({ label, score, sub }: { label: string; score: number; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div>
        <p className="text-sm text-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
      <span className={`text-sm font-bold px-2 py-0.5 rounded-lg border ${getScoreBg(score)}`}>
        {score}/10
      </span>
    </div>
  );
}
