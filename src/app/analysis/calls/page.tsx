"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { formatScore, getScoreBg, getScoreLabel, formatDateTime } from "@/lib/utils";
import { Upload, FileAudio, Loader2, Phone } from "lucide-react";
import type { CallAnalysisResult, SalesStage } from "@/types";

interface AnalysisRecord {
  id: string;
  title?: string;
  adminName?: string;
  status: string;
  overallScore?: number;
  duration?: number;
  createdAt: string;
  analysisResult?: CallAnalysisResult;
}

export default function CallsPage() {
  const [tab, setTab] = useState<"upload" | "history">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [adminName, setAdminName] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"idle" | "uploading" | "transcribing" | "analyzing" | "done">("idle");
  const [result, setResult] = useState<AnalysisRecord | null>(null);
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisRecord | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "audio/*": [".mp3", ".wav", ".ogg", ".m4a", ".aac"],
    },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024,
  });

  async function handleAnalyze() {
    if (!file) return;
    setLoading(true);
    setStep("uploading");

    try {
      const fd = new FormData();
      fd.append("audio", file);
      fd.append("adminName", adminName);
      fd.append("title", title || file.name);

      const uploadRes = await fetch("/api/calls/upload", { method: "POST", body: fd });
      if (!uploadRes.ok) throw new Error("Ошибка загрузки");
      const { id } = await uploadRes.json();

      setStep("transcribing");

      const analyzeRes = await fetch("/api/calls/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId: id }),
      });
      if (!analyzeRes.ok) throw new Error("Ошибка анализа");
      const data = await analyzeRes.json();

      setStep("done");
      setResult({ ...data.analysis, analysisResult: data.result });
    } catch (err) {
      console.error(err);
      alert("Произошла ошибка. Проверьте API ключи.");
      setStep("idle");
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    const res = await fetch("/api/calls/analyze");
    if (res.ok) setHistory(await res.json());
  }

  async function loadAnalysis(id: string) {
    const res = await fetch(`/api/calls/analyze?id=${id}`);
    if (res.ok) {
      const data = await res.json();
      setSelectedAnalysis({ ...data, analysisResult: data.analysisResult });
    }
  }

  useEffect(() => { loadHistory(); }, []);

  const displayAnalysis = selectedAnalysis ?? result;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero Banner — Emerald Glassmorphism */}
      <div className="relative rounded-2xl p-10 pb-16 mb-8 overflow-hidden hero-banner">
        <div className="glass-card p-8 relative z-10 max-w-2xl">
          <h1 className="heading-display text-3xl lg:text-4xl text-white">
            Анализ звонков
          </h1>
          <p className="mt-2 text-base text-white/70">
            Загрузите аудиозапись — AI транскрибирует и детально разберёт каждый этап продажи
          </p>
        </div>
      </div>

      {/* Табы */}
      <div className="flex gap-1 p-1 bg-muted rounded-pill w-fit mb-6">
        {(["upload", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t === "history") loadHistory(); }}
            className={`px-5 py-2.5 rounded-pill text-sm font-medium transition-all ${
              tab === t
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "upload" ? "Новый анализ" : `История (${history.length})`}
          </button>
        ))}
      </div>

      {tab === "upload" && (
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Левая панель загрузки */}
          <div className="lg:col-span-2 space-y-4">
            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`card-salon border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
                isDragActive
                  ? "border-primary bg-mint/30"
                  : file
                  ? "border-primary bg-mint/20"
                  : "border-accent hover:border-primary/50 hover:bg-mint/10"
              }`}
            >
              <input {...getInputProps()} />
              <div className="mb-3">
                {file ? (
                  <FileAudio size={32} className="mx-auto text-primary" />
                ) : (
                  <Upload size={32} className="mx-auto text-accent" />
                )}
              </div>
              {file ? (
                <div>
                  <p className="font-medium text-primary text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(file.size / 1024 / 1024).toFixed(1)} МБ
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {isDragActive ? "Отпустите файл" : "Перетащите аудиофайл"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    MP3, WAV, OGG, M4A · до 100 МБ
                  </p>
                </div>
              )}
            </div>

            {/* Поля */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Имя администратора
                </label>
                <input
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Анна Иванова"
                  className="w-full px-4 py-2.5 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Название / описание
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Входящий звонок, 15 янв"
                  className="w-full px-4 py-2.5 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={!file || loading}
              className="w-full btn-primary-salon flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? (
                <>
                  {step === "uploading" && "Загрузка..."}
                  {step === "transcribing" && "Транскрипция..."}
                  {step === "analyzing" && "AI анализирует..."}
                </>
              ) : (
                "Анализировать звонок"
              )}
            </button>

            {/* Прогресс */}
            {loading && (
              <div className="space-y-2">
                {["uploading", "transcribing", "analyzing"].map((s, i) => (
                  <div key={s} className="flex items-center gap-3 text-sm">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs
                        ${["uploading", "transcribing", "analyzing"].indexOf(step) > i
                          ? "bg-primary text-primary-foreground"
                          : step === s
                          ? "bg-secondary text-secondary-foreground animate-pulse-soft"
                          : "bg-muted text-muted-foreground"
                        }`}
                    >
                      {["uploading", "transcribing", "analyzing"].indexOf(step) > i ? "✓" : i + 1}
                    </div>
                    <span className={step === s ? "text-secondary font-medium" : "text-muted-foreground"}>
                      {s === "uploading" && "Загрузка файла"}
                      {s === "transcribing" && "Транскрипция (Whisper AI)"}
                      {s === "analyzing" && "AI анализ звонка"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Результат */}
          <div className="lg:col-span-3">
            {displayAnalysis?.analysisResult ? (
              <AnalysisResult data={displayAnalysis.analysisResult} />
            ) : (
              <div className="h-full flex items-center justify-center text-center p-12 card-salon border-2 border-dashed border-accent">
                <div>
                  <Upload size={48} className="mx-auto text-accent/50 mb-4" />
                  <p className="text-muted-foreground text-sm">
                    Загрузите аудиофайл и нажмите «Анализировать»
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-2">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                История анализов пуста
              </p>
            ) : (
              history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setSelectedId(item.id); loadAnalysis(item.id); }}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    selectedId === item.id
                      ? "border-primary bg-mint/20"
                      : "card-salon hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {item.title ?? "Звонок"}
                      </p>
                      {item.adminName && (
                        <p className="text-xs text-muted-foreground">{item.adminName}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(item.createdAt)}
                      </p>
                    </div>
                    {item.overallScore != null && (
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${getScoreBg(item.overallScore)}`}>
                        {formatScore(item.overallScore)}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="lg:col-span-3">
            {selectedAnalysis?.analysisResult ? (
              <AnalysisResult data={selectedAnalysis.analysisResult} />
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm card-salon">
                Выберите запись из списка
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AnalysisResult({ data }: { data: CallAnalysisResult }) {
  const [activeTab, setActiveTab] = useState<"overview" | "stages" | "plan">("overview");

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Общая оценка */}
      <div className={`p-5 rounded-lg border ${getScoreBg(data.overallScore)}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider opacity-70">Общая оценка</p>
            <p className="text-4xl font-heading font-bold mt-1">{data.overallScore}<span className="text-xl">/10</span></p>
            <p className="text-sm font-medium mt-0.5">{getScoreLabel(data.overallScore)}</p>
          </div>
          <div className="w-14 h-14 rounded-full bg-mint flex items-center justify-center">
            <Phone size={24} className="text-primary" />
          </div>
        </div>
        <p className="text-sm mt-3 opacity-80">{data.summary}</p>
      </div>

      {/* Внутренние табы */}
      <div className="flex gap-1 p-1 bg-muted rounded-pill w-fit">
        {(["overview", "stages", "plan"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-pill text-xs font-medium transition-all ${
              activeTab === t ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
            }`}
          >
            {t === "overview" ? "Обзор" : t === "stages" ? "Этапы" : "План развития"}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-4">
          {data.strengths?.length > 0 && (
            <div className="card-salon p-5">
              <h3 className="text-sm font-heading font-semibold text-primary mb-3 flex items-center gap-2">
                Сильные стороны
              </h3>
              <ul className="space-y-1.5">
                {data.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-foreground flex gap-2">
                    <span className="text-primary mt-0.5 flex-shrink-0">✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.criticalErrors?.length > 0 && (
            <div className="card-salon p-5">
              <h3 className="text-sm font-heading font-semibold text-destructive mb-3 flex items-center gap-2">
                Критические ошибки
              </h3>
              <div className="space-y-3">
                {data.criticalErrors.map((err, i) => (
                  <div key={i} className="p-3 rounded-lg bg-destructive/5 border border-destructive/10 space-y-2">
                    {err.timecode && (
                      <span className="text-xs font-mono bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                        [{err.timecode}]
                      </span>
                    )}
                    <div className="text-xs">
                      <p className="text-destructive font-medium">«{err.originalPhrase}»</p>
                      <p className="text-muted-foreground mt-1">→ <span className="text-primary font-medium">{err.recommendation}</span></p>
                      <p className="text-muted-foreground mt-1 italic">{err.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(data.parasiteWords?.length ?? 0) > 0 && (
            <div className="card-salon p-5">
              <h3 className="text-sm font-heading font-semibold text-secondary mb-2">Слова-паразиты</h3>
              <div className="flex flex-wrap gap-2">
                {(data.parasiteWords ?? []).map((w, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-pill bg-muted border border-border text-xs text-foreground font-medium">
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "stages" && (
        <div className="space-y-3">
          {data.stages?.map((stage: SalesStage) => (
            <StageCard key={stage.key} stage={stage} />
          ))}
        </div>
      )}

      {activeTab === "plan" && (
        <div className="card-salon p-5">
          <h3 className="text-sm font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
            План развития
          </h3>
          <div className="space-y-3">
            {data.developmentPlan?.map((item, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-lg bg-muted">
                <span className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {item.priority}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{item.skill}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.action}</p>
                  <p className="text-xs text-secondary font-medium mt-1">{item.deadline}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StageCard({ stage }: { stage: SalesStage }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card-salon overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-3">
          <span className={`text-sm font-bold px-2.5 py-1 rounded-lg border ${getScoreBg(stage.score)}`}>
            {stage.score}/10
          </span>
          <span className="text-sm font-medium text-foreground">{stage.name}</span>
        </div>
        <span className="text-muted-foreground text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          <p className="text-sm text-muted-foreground">{stage.comment}</p>
          {stage.issues?.map((issue, i) => (
            <div key={i} className="p-3 rounded-lg bg-destructive/5 border border-destructive/10 text-xs space-y-1">
              <p className="text-destructive font-medium">«{issue.originalPhrase}»</p>
              <p className="text-primary">→ {issue.recommendation}</p>
              <p className="text-muted-foreground italic">{issue.reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
