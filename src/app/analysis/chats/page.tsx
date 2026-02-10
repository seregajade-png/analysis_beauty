"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { formatScore, getScoreBg, getScoreLabel, formatDateTime } from "@/lib/utils";
import type { ChatAnalysisResult } from "@/types";

const SOURCE_OPTIONS = [
  { value: "WHATSAPP", label: "WhatsApp", icon: "💬" },
  { value: "TELEGRAM", label: "Telegram", icon: "✈" },
  { value: "INSTAGRAM", label: "Instagram Direct", icon: "◎" },
  { value: "TEXT", label: "Текстовый файл", icon: "📄" },
  { value: "SCREENSHOT", label: "Скриншот", icon: "🖼" },
];

export default function ChatsPage() {
  const [mode, setMode] = useState<"text" | "screenshot">("text");
  const [source, setSource] = useState("WHATSAPP");
  const [chatText, setChatText] = useState("");
  const [adminName, setAdminName] = useState("");
  const [title, setTitle] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ analysis: unknown; result: ChatAnalysisResult } | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    setImages((prev) => [...prev, ...accepted]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    maxFiles: 10,
  });

  async function handleAnalyze() {
    if (!chatText.trim() && images.length === 0) return;
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("text", chatText);
      fd.append("source", source);
      fd.append("adminName", adminName);
      fd.append("title", title || "Переписка");
      images.forEach((img) => fd.append("images", img));

      const res = await fetch("/api/chats/analyze", { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResult(data);
    } catch {
      alert("Ошибка анализа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-dark flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-green to-brand-green-light flex items-center justify-center text-white">✉</span>
          Анализ переписок
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Вставьте текст или загрузите скриншоты переписки — AI разберёт каждое сообщение
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Форма */}
        <div className="lg:col-span-2 space-y-4">
          {/* Источник */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Платформа
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {SOURCE_OPTIONS.slice(0, 3).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSource(opt.value)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs transition-all ${
                    source === opt.value
                      ? "border-brand-green bg-brand-green-bg text-brand-green font-semibold"
                      : "border-border text-muted-foreground hover:border-brand-green/50"
                  }`}
                >
                  <span>{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1.5 mt-1.5">
              {SOURCE_OPTIONS.slice(3).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setSource(opt.value); setMode(opt.value === "SCREENSHOT" ? "screenshot" : "text"); }}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs transition-all ${
                    source === opt.value
                      ? "border-brand-green bg-brand-green-bg text-brand-green font-semibold"
                      : "border-border text-muted-foreground hover:border-brand-green/50"
                  }`}
                >
                  <span>{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Режим ввода */}
          <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
            {(["text", "screenshot"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  mode === m ? "bg-white text-brand-green shadow-sm" : "text-muted-foreground"
                }`}
              >
                {m === "text" ? "Текст" : "Скриншоты"}
              </button>
            ))}
          </div>

          {mode === "text" ? (
            <textarea
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder={"[Клиент]: Здравствуйте, интересует ботокс для волос\n[Администратор]: Здравствуйте! Да, у нас есть эта процедура..."}
              rows={10}
              className="w-full px-3 py-2.5 rounded-xl border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green font-mono"
            />
          ) : (
            <div>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  isDragActive ? "border-brand-green bg-brand-green-bg" : "border-border hover:border-brand-green/50"
                }`}
              >
                <input {...getInputProps()} />
                <p className="text-3xl mb-2">🖼</p>
                <p className="text-sm text-muted-foreground">
                  Перетащите скриншоты переписки
                </p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG · до 10 файлов</p>
              </div>
              {images.length > 0 && (
                <div className="mt-2 space-y-1">
                  {images.map((img, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted text-xs">
                      <span>{img.name}</span>
                      <button
                        onClick={() => setImages((p) => p.filter((_, j) => j !== i))}
                        className="text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Метаданные */}
          <div className="space-y-2">
            <input
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="Имя администратора"
              className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30"
            />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Название (необязательно)"
              className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/30"
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading || (!chatText.trim() && images.length === 0)}
            className="w-full py-3 rounded-xl bg-brand-green hover:bg-brand-green-dark text-white font-semibold text-sm transition-all disabled:opacity-40 shadow-sm"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⟳</span> AI анализирует...
              </span>
            ) : (
              "Анализировать переписку"
            )}
          </button>
        </div>

        {/* Результат */}
        <div className="lg:col-span-3">
          {result?.result ? (
            <ChatAnalysisView data={result.result} />
          ) : (
            <div className="h-full flex items-center justify-center text-center p-12 bg-muted/30 rounded-2xl border border-dashed border-border">
              <div>
                <div className="text-5xl mb-4 opacity-30">✉</div>
                <p className="text-muted-foreground text-sm">
                  Вставьте переписку и нажмите «Анализировать»
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChatAnalysisView({ data }: { data: ChatAnalysisResult }) {
  const [tab, setTab] = useState<"messages" | "stages" | "metrics">("messages");

  return (
    <div className="space-y-4 animate-fade-in">
      <div className={`p-5 rounded-2xl border ${getScoreBg(data.overallScore)}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider opacity-70">Общая оценка</p>
            <p className="text-4xl font-bold mt-1">{data.overallScore}<span className="text-xl">/10</span></p>
            <p className="text-sm font-medium mt-0.5">{getScoreLabel(data.overallScore)}</p>
          </div>
          <div className="text-5xl opacity-20">✉</div>
        </div>
        <p className="text-sm mt-3 opacity-80">{data.summary}</p>
      </div>

      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {(["messages", "stages", "metrics"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              tab === t ? "bg-white text-brand-green shadow-sm" : "text-muted-foreground"
            }`}
          >
            {t === "messages" ? "Сообщения" : t === "stages" ? "Этапы" : "Метрики"}
          </button>
        ))}
      </div>

      {tab === "messages" && (
        <div className="space-y-3">
          {data.messageAnalysis?.map((msg, i) => (
            <div
              key={i}
              className={`p-3 rounded-xl border ${
                msg.sender === "admin"
                  ? msg.rating === "good"
                    ? "bg-green-50 border-green-200"
                    : msg.rating === "bad"
                    ? "bg-red-50 border-red-200"
                    : "bg-white border-border"
                  : "bg-muted border-border"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  msg.sender === "admin"
                    ? "bg-brand-green text-white"
                    : "bg-muted-foreground text-white"
                }`}>
                  {msg.sender === "admin" ? "Администратор" : "Клиент"}
                </span>
                {msg.rating === "good" && <span className="text-xs text-green-600">✓ хорошо</span>}
                {msg.rating === "bad" && <span className="text-xs text-red-600">⚠ ошибка</span>}
              </div>
              <p className="text-sm text-foreground">{msg.text}</p>
              {msg.issues?.map((issue, j) => (
                <p key={j} className="text-xs text-red-600 mt-1">⚠ {issue}</p>
              ))}
              {msg.improvements && (
                <p className="text-xs text-green-700 mt-1 p-2 bg-green-50 rounded-lg">
                  ✦ Лучше: {msg.improvements}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "stages" && (
        <div className="space-y-3">
          {data.stages?.map((stage) => (
            <div key={stage.key} className="card-brand p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className={`text-sm font-bold px-2.5 py-1 rounded-lg border ${getScoreBg(stage.score)}`}>
                  {stage.score}/10
                </span>
                <span className="text-sm font-medium">{stage.name}</span>
              </div>
              <p className="text-sm text-muted-foreground">{stage.comment}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "metrics" && data.additionalMetrics && (
        <div className="card-brand p-4 space-y-3">
          {Object.entries(data.additionalMetrics).map(([key, value]) => {
            const labels: Record<string, string> = {
              responseSpeed: "Скорость ответа",
              avgMessageLength: "Длина сообщений",
              emojiUsage: "Использование эмодзи",
              literacy: "Грамотность",
              closingAttempt: "Закрытие на запись",
              personalization: "Персонализация",
            };
            return (
              <div key={key} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <span className="text-sm text-muted-foreground">{labels[key] ?? key}</span>
                <span className="text-sm font-medium text-foreground">{value as string}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
