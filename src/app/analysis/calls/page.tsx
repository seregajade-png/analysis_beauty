"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { formatScore, getScoreBg, getScoreLabel, formatDateTime } from "@/lib/utils";
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
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-orange to-brand-orange-light flex items-center justify-center text-white">☎</span>
          Анализ звонков
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Загрузите аудиозапись — AI транскрибирует и детально разберёт каждый этап продажи
        </p>
      </div>

      {/* Табы */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit mb-6">
        {(["upload", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t === "history") loadHistory(); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t
                ? "bg-white text-brand-orange shadow-sm"
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
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                isDragActive
                  ? "border-brand-orange bg-brand-orange-bg"
                  : file
                  ? "border-brand-green bg-brand-green-bg"
                  : "border-border hover:border-brand-orange/50 hover:bg-brand-orange-bg/50"
              }`}
            >
              <input {...getInputProps()} />
              <div className="text-4xl mb-3">{file ? "✓" : "☁"}</div>
              {file ? (
                <div>
                  <p className="font-medium text-brand-green text-sm">{file.name}</p>
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
                  className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange"
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
                  className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange"
                />
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={!file || loading}
              className="w-full py-3 rounded-xl bg-brand-orange hover:bg-brand-orange-dark text-white font-semibold text-sm transition-all disabled:opacity-40 shadow-sm hover:shadow-md"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⟳</span>
                  {step === "uploading" && "Загрузка..."}
                  {step === "transcribing" && "Транскрипция..."}
                  {step === "analyzing" && "AI анализирует..."}
                </span>
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
                          ? "bg-brand-green text-white"
                          : step === s
                          ? "bg-brand-orange text-white animate-pulse-soft"
                          : "bg-muted text-muted-foreground"
                        }`}
                    >
                      {["uploading", "transcribing", "analyzing"].indexOf(step) > i ? "✓" : i + 1}
                    </div>
                    <span className={step === s ? "text-brand-orange font-medium" : "text-muted-foreground"}>
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
              <div className="h-full flex items-center justify-center text-center p-12 bg-muted/30 rounded-2xl border border-dashed border-border">
                <div>
                  <div className="text-5xl mb-4 opacity-30">◎</div>
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
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedId === item.id
                      ? "border-brand-orange bg-brand-orange-bg"
                      : "border-border bg-white hover:border-brand-orange/50"
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
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
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
      <div className={`p-5 rounded-2xl border ${getScoreBg(data.overallScore)}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider opacity-70">Общая оценка</p>
            <p className="text-4xl font-bold mt-1">{data.overallScore}<span className="text-xl">/10</span></p>
            <p className="text-sm font-medium mt-0.5">{getScoreLabel(data.overallScore)}</p>
          </div>
          <div className="text-5xl opacity-20">☎</div>
        </div>
        <p className="text-sm mt-3 opacity-80">{data.summary}</p>
      </div>

      {/* Внутренние табы */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {(["overview", "stages", "plan"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === t ? "bg-white text-brand-orange shadow-sm" : "text-muted-foreground"
            }`}
          >
            {t === "overview" ? "Обзор" : t === "stages" ? "Этапы" : "План развития"}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-4">
          {/* Сильные стороны */}
          {data.strengths?.length > 0 && (
            <div className="card-brand p-4">
              <h3 className="text-sm font-semibold text-brand-green mb-3 flex items-center gap-2">
                <span>✦</span> Сильные стороны
              </h3>
              <ul className="space-y-1.5">
                {data.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-foreground flex gap-2">
                    <span className="text-brand-green mt-0.5 flex-shrink-0">✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Критические ошибки */}
          {data.criticalErrors?.length > 0 && (
            <div className="card-brand p-4">
              <h3 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
                <span>⚠</span> Критические ошибки
              </h3>
              <div className="space-y-3">
                {data.criticalErrors.map((err, i) => (
                  <div key={i} className="p-3 rounded-xl bg-red-50 border border-red-100 space-y-2">
                    {err.timecode && (
                      <span className="text-xs font-mono bg-red-200 text-red-800 px-2 py-0.5 rounded-full">
                        [{err.timecode}]
                      </span>
                    )}
                    <div className="text-xs">
                      <p className="text-red-800 font-medium">«{err.originalPhrase}»</p>
                      <p className="text-muted-foreground mt-1">→ <span className="text-green-700 font-medium">{err.recommendation}</span></p>
                      <p className="text-muted-foreground mt-1 italic">{err.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Слова-паразиты */}
          {(data.parasiteWords?.length ?? 0) > 0 && (
            <div className="card-brand p-4">
              <h3 className="text-sm font-semibold text-orange-600 mb-2">Слова-паразиты</h3>
              <div className="flex flex-wrap gap-2">
                {(data.parasiteWords ?? []).map((w, i) => (
                  <span key={i} className="px-2 py-1 rounded-lg bg-orange-50 border border-orange-200 text-xs text-orange-700 font-medium">
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
        <div className="card-brand p-4">
          <h3 className="text-sm font-semibold text-brand-dark mb-4 flex items-center gap-2">
            <span className="text-brand-orange">◈</span> План развития
          </h3>
          <div className="space-y-3">
            {data.developmentPlan?.map((item, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-xl bg-muted">
                <span className="w-6 h-6 rounded-full bg-brand-orange text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {item.priority}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{item.skill}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.action}</p>
                  <p className="text-xs text-brand-orange font-medium mt-1">⏱ {item.deadline}</p>
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
    <div className={`card-brand overflow-hidden`}>
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
            <div key={i} className="p-3 rounded-xl bg-red-50 border border-red-100 text-xs space-y-1">
              <p className="text-red-800 font-medium">«{issue.originalPhrase}»</p>
              <p className="text-green-700">→ {issue.recommendation}</p>
              <p className="text-muted-foreground italic">{issue.reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
