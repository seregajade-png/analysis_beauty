"use client";

import { useState, useEffect } from "react";
import { formatScore, getScoreBg, getScoreLabel, formatDate, formatDateTime } from "@/lib/utils";
import type { AdminSkill, DevelopmentItem } from "@/types";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Phone, MessageSquare, FlaskConical, Gamepad2, Package, Database, ChevronLeft } from "lucide-react";

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

interface HistoryCall {
  id: string;
  title?: string;
  adminName?: string;
  overallScore?: number;
  duration?: number;
  createdAt: string;
}

interface HistoryChat {
  id: string;
  title?: string;
  adminName?: string;
  source?: string;
  overallScore?: number;
  createdAt: string;
}

interface HistoryTest {
  id: string;
  testType: string;
  score?: number;
  fearLevel?: string;
  feedback?: string;
  createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface DetailRecord { [key: string]: any; }

const FEAR_LABELS: Record<string, string> = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
};

const TEST_TYPE_LABELS: Record<string, { label: string; icon: typeof Phone }> = {
  PRACTICAL_CASE: { label: "Практический кейс", icon: FlaskConical },
  ROLEPLAY: { label: "Ролевая игра", icon: Gamepad2 },
  PRODUCT_KNOWLEDGE: { label: "Знание продуктов", icon: Package },
  CRM_KNOWLEDGE: { label: "Работа с CRM", icon: Database },
};

export default function AdminCardPage() {
  const [card, setCard] = useState<AdminCard | null>(null);
  const [cardHistory, setCardHistory] = useState<AdminCard[]>([]);
  const [generating, setGenerating] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "skills" | "plan" | "history">("overview");

  // History state
  const [historyFilter, setHistoryFilter] = useState<"all" | "calls" | "chats" | "tests">("all");
  const [calls, setCalls] = useState<HistoryCall[]>([]);
  const [chats, setChats] = useState<HistoryChat[]>([]);
  const [tests, setTests] = useState<HistoryTest[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<{ type: string; data: DetailRecord } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin-card")
      .then((r) => r.json())
      .then((data: AdminCard[]) => {
        setCardHistory(data);
        if (data.length > 0) setCard(data[0]);
      });
  }, []);

  async function loadHistory() {
    if (historyLoaded) return;
    const res = await fetch("/api/admin-card/history");
    if (res.ok) {
      const data = await res.json();
      setCalls(data.calls ?? []);
      setChats(data.chats ?? []);
      setTests(data.tests ?? []);
      setHistoryLoaded(true);
    }
  }

  async function loadDetail(type: "calls" | "chats" | "tests", id: string) {
    setDetailLoading(true);
    const res = await fetch(`/api/admin-card/history?type=${type}&id=${id}`);
    if (res.ok) {
      const data = await res.json();
      setSelectedDetail({ type, data });
    }
    setDetailLoading(false);
  }

  async function generateCard() {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin-card", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json();
      setCard(data.card);
      const updated = await fetch("/api/admin-card").then((r) => r.json());
      setCardHistory(updated);
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
    <div className="max-w-6xl mx-auto">
      {/* Hero Banner */}
      <div className="relative rounded-2xl p-6 md:p-10 mb-6 overflow-hidden hero-banner-warm">
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-[#DECCBD]/50 blur-3xl" />
        <div className="absolute top-8 right-12 w-48 h-48 rounded-full bg-[#C09C7E]/40 blur-3xl" />
        <div className="absolute -bottom-12 left-1/3 w-56 h-56 rounded-full bg-[#866E5B]/30 blur-3xl" />
        <div className="glass-card p-5 md:p-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="heading-display text-xl md:text-2xl lg:text-3xl text-white flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">◉</span>
                Карточка администратора
              </h1>
              <p className="text-white/70 text-sm mt-2">
                Сводная оценка навыков на основе всех проведённых анализов и тестов
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {cardHistory.length > 1 && (
                <select
                  onChange={(e) => {
                    const found = cardHistory.find((h) => h.id === e.target.value);
                    if (found) setCard(found);
                  }}
                  className="px-3 py-2 rounded-xl border border-white/30 bg-white/10 text-white text-sm focus:outline-none"
                >
                  {cardHistory.map((h, i) => (
                    <option key={h.id} value={h.id} className="text-foreground">
                      {i === 0 ? "Последняя" : formatDate(h.createdAt)}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={generateCard}
                disabled={generating}
                className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-all disabled:opacity-40"
              >
                {generating ? "⟳ Генерирую..." : "⟳ Обновить"}
              </button>
              {card && (
                <>
                  <button onClick={exportPDF} className="px-4 py-2 rounded-xl border border-white/30 text-white text-sm hover:bg-white/10 transition-all">
                    ↓ PDF
                  </button>
                  <button
                    onClick={toggleShare}
                    className={`px-4 py-2 rounded-xl border text-sm transition-all ${card.isShared ? "border-white/50 bg-white/20 text-white" : "border-white/30 text-white hover:bg-white/10"}`}
                  >
                    {card.isShared ? "✓ Ссылка активна" : "⇗ Поделиться"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {shareUrl && (
        <div className="mb-4 p-3 rounded-xl bg-mint/20 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span className="text-sm text-primary font-medium shrink-0">Ссылка:</span>
          <a href={shareUrl} target="_blank" className="text-sm text-primary underline truncate max-w-full sm:max-w-xs">{shareUrl}</a>
          <button onClick={() => navigator.clipboard.writeText(shareUrl)} className="text-xs text-primary hover:underline shrink-0">Копировать</button>
        </div>
      )}

      {!card ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4 opacity-30">◉</div>
          <p className="text-muted-foreground mb-4">Карточка ещё не создана</p>
          <button onClick={generateCard} disabled={generating} className="px-6 py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/80 transition-all disabled:opacity-40">
            {generating ? "⟳ Генерирую..." : "Создать карточку"}
          </button>
          <p className="text-xs text-muted-foreground mt-3">AI проанализирует все ваши результаты и составит карточку</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Левая панель */}
          <div className="lg:col-span-1 space-y-4">
            {/* Профиль */}
            <div className="relative rounded-2xl p-6 overflow-hidden hero-banner-warm">
              <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-[#DECCBD]/50 blur-3xl" />
              <div className="absolute -bottom-8 right-4 w-32 h-32 rounded-full bg-[#C09C7E]/40 blur-3xl" />
              <div className="glass-card p-5 relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold text-white">
                    {card.adminName[0]}
                  </div>
                  <div>
                    <p className="font-bold text-lg text-white">{card.adminName}</p>
                    {card.salonName && <p className="text-sm text-white/70">{card.salonName}</p>}
                    <p className="text-xs text-white/50">{formatDate(card.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-xs text-white/60">Общая оценка</p>
                    <p className="text-4xl font-bold text-white">
                      {formatScore(card.overallScore ?? null)}
                      <span className="text-xl text-white/60">/10</span>
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{getScoreLabel(card.overallScore ?? 0)}</p>
                    {card.callSummary && (
                      <p className="text-xs text-white/60 mt-1">
                        {card.callSummary.totalCalls} звонков · ср. {formatScore(card.callSummary.avgScore)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Результаты тестов */}
            {card.testSummary && (
              <div className="card-salon p-4 space-y-2">
                <h3 className="text-sm font-semibold mb-3">Результаты тестов</h3>
                {card.testSummary.practicalCase && <TestRow label="Практический кейс" score={card.testSummary.practicalCase.score} />}
                {card.testSummary.roleplay && <TestRow label="Ролевая игра" score={card.testSummary.roleplay.score} sub={`Страх: ${FEAR_LABELS[card.testSummary.roleplay.fearLevel] ?? card.testSummary.roleplay.fearLevel}`} />}
                {card.testSummary.productKnowledge && <TestRow label="Знание продуктов" score={card.testSummary.productKnowledge.score} />}
                {card.testSummary.crmKnowledge && <TestRow label="CRM" score={card.testSummary.crmKnowledge.score} />}
              </div>
            )}

            {/* Радарная диаграмма */}
            {radarData.length > 0 && (
              <div className="card-salon p-4">
                <h3 className="text-sm font-semibold mb-3">Профиль навыков</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Radar name="Оценка" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
                    <Tooltip formatter={(val) => [`${val}/10`, "Оценка"]} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Правая панель */}
          <div className="lg:col-span-2 space-y-4">
            {/* Табы */}
            <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit flex-wrap">
              {(["overview", "skills", "plan", "history"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setActiveTab(t);
                    if (t === "history") loadHistory();
                    if (t !== "history") setSelectedDetail(null);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === t ? "bg-white text-primary shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  {t === "overview" ? "Обзор" : t === "skills" ? "Навыки" : t === "plan" ? "План развития" : "История"}
                </button>
              ))}
            </div>

            {/* === Обзор === */}
            {activeTab === "overview" && card.skills && (
              <div className="space-y-3">
                {card.skills.map((skill) => (
                  <div key={skill.key} className={`p-4 rounded-2xl border ${getScoreBg(skill.score)}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold">{skill.name}</span>
                      <span className="text-lg font-bold">{skill.score}/10</span>
                    </div>
                    <div className="w-full bg-black/10 rounded-full h-1.5 mb-2">
                      <div className="h-1.5 rounded-full bg-current opacity-60 transition-all" style={{ width: `${skill.score * 10}%` }} />
                    </div>
                    <p className="text-xs opacity-80">{skill.details}</p>
                  </div>
                ))}
              </div>
            )}

            {/* === Навыки === */}
            {activeTab === "skills" && card.skills && (
              <div className="space-y-4">
                {card.skills.map((skill) => (
                  <div key={skill.key} className="card-salon p-5">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-foreground">{skill.name}</h3>
                      <span className={`text-sm font-bold px-2.5 py-1 rounded-lg border ${getScoreBg(skill.score)}`}>{skill.score}/10</span>
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

            {/* === План развития === */}
            {activeTab === "plan" && card.developmentPlan && (
              <div className="space-y-3">
                {card.developmentPlan.map((item, i) => (
                  <div key={i} className={`p-4 rounded-2xl border ${i === 0 ? "bg-muted border-secondary/30" : "card-salon"}`}>
                    <div className="flex items-start gap-3">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? "bg-secondary text-white" : "bg-muted text-muted-foreground"}`}>
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

            {/* === История === */}
            {activeTab === "history" && (
              <div className="space-y-4">
                {/* Детальный просмотр */}
                {selectedDetail ? (
                  <DetailView
                    type={selectedDetail.type}
                    data={selectedDetail.data}
                    loading={detailLoading}
                    onBack={() => setSelectedDetail(null)}
                  />
                ) : (
                  <>
                    {/* Фильтр */}
                    <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit flex-wrap">
                      {(["all", "calls", "chats", "tests"] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setHistoryFilter(f)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            historyFilter === f ? "bg-white text-primary shadow-sm" : "text-muted-foreground"
                          }`}
                        >
                          {f === "all" ? "Всё" : f === "calls" ? `Звонки (${calls.length})` : f === "chats" ? `Переписки (${chats.length})` : `Тесты (${tests.length})`}
                        </button>
                      ))}
                    </div>

                    {/* Список */}
                    <div className="space-y-2">
                      {(historyFilter === "all" || historyFilter === "calls") && calls.map((c) => (
                        <button key={`call-${c.id}`} onClick={() => loadDetail("calls", c.id)} className="w-full text-left p-4 rounded-xl card-salon hover:border-primary/50 transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Phone size={14} className="text-primary" /></div>
                              <div>
                                <p className="text-sm font-medium text-foreground">{c.title ?? "Звонок"}</p>
                                <p className="text-xs text-muted-foreground">{c.adminName ? `${c.adminName} · ` : ""}{formatDateTime(c.createdAt)}</p>
                              </div>
                            </div>
                            {c.overallScore != null && (
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${getScoreBg(c.overallScore)}`}>{formatScore(c.overallScore)}</span>
                            )}
                          </div>
                        </button>
                      ))}

                      {(historyFilter === "all" || historyFilter === "chats") && chats.map((c) => (
                        <button key={`chat-${c.id}`} onClick={() => loadDetail("chats", c.id)} className="w-full text-left p-4 rounded-xl card-salon hover:border-primary/50 transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center"><MessageSquare size={14} className="text-secondary" /></div>
                              <div>
                                <p className="text-sm font-medium text-foreground">{c.title ?? "Переписка"}</p>
                                <p className="text-xs text-muted-foreground">{c.source ? `${c.source} · ` : ""}{formatDateTime(c.createdAt)}</p>
                              </div>
                            </div>
                            {c.overallScore != null && (
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${getScoreBg(c.overallScore)}`}>{formatScore(c.overallScore)}</span>
                            )}
                          </div>
                        </button>
                      ))}

                      {(historyFilter === "all" || historyFilter === "tests") && tests.map((t) => {
                        const meta = TEST_TYPE_LABELS[t.testType];
                        const Icon = meta?.icon ?? FlaskConical;
                        return (
                          <button key={`test-${t.id}`} onClick={() => loadDetail("tests", t.id)} className="w-full text-left p-4 rounded-xl card-salon hover:border-primary/50 transition-all">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center"><Icon size={14} className="text-foreground" /></div>
                                <div>
                                  <p className="text-sm font-medium text-foreground">{meta?.label ?? t.testType}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {t.fearLevel ? `Страх: ${FEAR_LABELS[t.fearLevel] ?? t.fearLevel} · ` : ""}
                                    {formatDateTime(t.createdAt)}
                                  </p>
                                </div>
                              </div>
                              {t.score != null && (
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${getScoreBg(t.score)}`}>{formatScore(t.score)}</span>
                              )}
                            </div>
                          </button>
                        );
                      })}

                      {/* Пусто */}
                      {((historyFilter === "all" && calls.length === 0 && chats.length === 0 && tests.length === 0) ||
                        (historyFilter === "calls" && calls.length === 0) ||
                        (historyFilter === "chats" && chats.length === 0) ||
                        (historyFilter === "tests" && tests.length === 0)) && (
                        <div className="text-center py-12 text-muted-foreground">
                          <p className="text-sm">Нет записей</p>
                          <p className="text-xs mt-1">Пройдите анализы и тесты — результаты появятся здесь</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Detail View ─── */
function DetailView({ type, data, loading, onBack }: { type: string; data: DetailRecord; loading: boolean; onBack: () => void }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="animate-spin text-2xl text-primary">⟳</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft size={16} /> Назад к списку
      </button>

      {/* Общая оценка */}
      {data.overallScore != null && (
        <div className={`p-5 rounded-2xl border ${getScoreBg(data.overallScore)}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider opacity-70">
                {type === "calls" ? "Анализ звонка" : type === "chats" ? "Анализ переписки" : TEST_TYPE_LABELS[data.testType]?.label ?? "Тест"}
              </p>
              <p className="text-3xl font-bold mt-1">{data.overallScore ?? data.score}<span className="text-lg">/10</span></p>
              <p className="text-sm font-medium mt-0.5">{getScoreLabel(data.overallScore ?? data.score ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs opacity-60">{formatDateTime(data.createdAt)}</p>
              {data.title && <p className="text-sm font-medium mt-0.5">{data.title}</p>}
              {data.adminName && <p className="text-xs opacity-70">{data.adminName}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Test score (tests don't have overallScore, they have score) */}
      {data.overallScore == null && data.score != null && (
        <div className={`p-5 rounded-2xl border ${getScoreBg(data.score)}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider opacity-70">
                {TEST_TYPE_LABELS[data.testType]?.label ?? "Тест"}
              </p>
              <p className="text-3xl font-bold mt-1">{formatScore(data.score)}<span className="text-lg">/10</span></p>
              <p className="text-sm font-medium mt-0.5">{getScoreLabel(data.score)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-60">{formatDateTime(data.createdAt)}</p>
              {data.fearLevel && (
                <p className="text-sm font-medium mt-1">Страх звонков: {FEAR_LABELS[data.fearLevel] ?? data.fearLevel}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Feedback */}
      {data.feedback && (
        <div className="card-salon p-5">
          <h3 className="text-sm font-semibold text-foreground mb-2">Обратная связь</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.feedback}</p>
        </div>
      )}

      {/* Summary (calls/chats) */}
      {data.analysisResult?.summary && (
        <div className="card-salon p-5">
          <h3 className="text-sm font-semibold text-foreground mb-2">Резюме</h3>
          <p className="text-sm text-muted-foreground">{data.analysisResult.summary}</p>
        </div>
      )}

      {/* Strengths */}
      {data.analysisResult?.strengths?.length > 0 && (
        <div className="card-salon p-5">
          <h3 className="text-sm font-semibold text-primary mb-2">Сильные стороны</h3>
          <ul className="space-y-1.5">
            {data.analysisResult.strengths.map((s: string, i: number) => (
              <li key={i} className="text-sm text-foreground flex gap-2"><span className="text-primary mt-0.5 flex-shrink-0">✓</span>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Critical errors */}
      {data.analysisResult?.criticalErrors?.length > 0 && (
        <div className="card-salon p-5">
          <h3 className="text-sm font-semibold text-destructive mb-2">Критические ошибки</h3>
          <div className="space-y-2">
            {data.analysisResult.criticalErrors.map((err: { timecode?: string; originalPhrase?: string; recommendation?: string; reason?: string }, i: number) => (
              <div key={i} className="p-3 rounded-lg bg-destructive/5 border border-destructive/10 text-xs space-y-1">
                {err.timecode && <span className="font-mono bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">[{err.timecode}]</span>}
                {err.originalPhrase && <p className="text-destructive font-medium">«{err.originalPhrase}»</p>}
                {err.recommendation && <p className="text-primary">→ {err.recommendation}</p>}
                {err.reason && <p className="text-muted-foreground italic">{err.reason}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stages */}
      {data.analysisResult?.stages?.length > 0 && (
        <div className="card-salon p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Этапы</h3>
          <div className="space-y-2">
            {data.analysisResult.stages.map((stage: { key?: string; name: string; score: number; comment?: string }, i: number) => (
              <div key={stage.key ?? i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm text-foreground">{stage.name}</p>
                  {stage.comment && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{stage.comment}</p>}
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border shrink-0 ml-3 ${getScoreBg(stage.score)}`}>{stage.score}/10</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weak areas (tests) */}
      {data.weakAreas?.length > 0 && (
        <div className="card-salon p-5">
          <h3 className="text-sm font-semibold text-destructive mb-2">Слабые стороны</h3>
          <ul className="space-y-1">
            {data.weakAreas.map((w: string, i: number) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2"><span className="text-destructive flex-shrink-0">—</span>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Development plan */}
      {data.analysisResult?.developmentPlan?.length > 0 && (
        <div className="card-salon p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">План развития</h3>
          <div className="space-y-2">
            {data.analysisResult.developmentPlan.map((item: { priority: number; skill: string; action: string; deadline?: string }, i: number) => (
              <div key={i} className="flex gap-3 p-3 rounded-lg bg-muted">
                <span className="w-6 h-6 rounded-full bg-secondary text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{item.priority}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.skill}</p>
                  <p className="text-xs text-muted-foreground">{item.action}</p>
                  {item.deadline && <p className="text-xs text-secondary font-medium mt-1">{item.deadline}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transcription (calls) */}
      {data.transcription && (
        <div className="card-salon p-5">
          <h3 className="text-sm font-semibold text-foreground mb-2">Транскрипция</h3>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap max-h-64 overflow-y-auto font-mono leading-relaxed">{data.transcription}</p>
        </div>
      )}
    </div>
  );
}

/* ─── Helpers ─── */
function TestRow({ label, score, sub }: { label: string; score: number; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div>
        <p className="text-sm text-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
      <span className={`text-sm font-bold px-2 py-0.5 rounded-lg border ${getScoreBg(score)}`}>{score}/10</span>
    </div>
  );
}
