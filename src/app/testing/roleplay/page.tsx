"use client";

import { useState, useEffect, useRef } from "react";
import { getScoreBg } from "@/lib/utils";
import type { RoleplayAnalysisResult } from "@/types";

interface Scenario {
  id: string;
  title: string;
  clientPhrase: string;
  context?: string;
  difficulty: number;
}

const FEAR_LABELS = {
  low: { label: "Низкий", color: "text-green-600", bg: "bg-green-50 border-green-200" },
  medium: { label: "Средний", color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200" },
  high: { label: "Высокий", color: "text-red-600", bg: "bg-red-50 border-red-200" },
};

export default function RoleplayPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selected, setSelected] = useState<Scenario | null>(null);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RoleplayAnalysisResult | null>(null);
  const [seconds, setSeconds] = useState(0);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch("/api/testing/roleplay")
      .then((r) => r.json())
      .then((data) => {
        setScenarios(data);
        if (data.length > 0) setSelected(data[0]);
      });
  }, []);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      mediaRef.current = recorder;
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      alert("Нет доступа к микрофону");
    }
  }

  function stopRecording() {
    mediaRef.current?.stop();
    setRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function handleSubmit() {
    if (!selected || !audioBlob) return;
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("clientPhrase", selected.clientPhrase);
      fd.append("audio", audioBlob, "response.webm");

      const res = await fetch("/api/testing/roleplay", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.result);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка анализа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero Banner — Emerald Glassmorphism */}
      <div className="relative rounded-2xl p-6 pb-10 md:p-10 md:pb-16 mb-6 overflow-hidden hero-banner">
        <div className="glass-card p-5 md:p-8 relative z-10 max-w-2xl">
          <h1 className="heading-display text-xl md:text-2xl lg:text-3xl text-white flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">▷</span>
            Мини-ролевая игра
          </h1>
          <p className="text-white/70 text-sm mt-2">
            Ответьте на фразу клиента голосом — AI оценит уверенность, интонацию и структуру
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Выбор сценария */}
          {scenarios.length > 1 && (
            <div className="space-y-1.5">
              {scenarios.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setSelected(s); setResult(null); setAudioBlob(null); setAudioUrl(null); setSeconds(0); }}
                  className={`w-full text-left p-3 rounded-xl border text-sm transition-all ${
                    selected?.id === s.id
                      ? "border-primary bg-mint/20 font-medium text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{s.title}</span>
                    <span className="text-xs opacity-60">{"★".repeat(s.difficulty)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Ситуация */}
          {selected && (
            <div className="relative rounded-2xl p-6 pb-10 overflow-hidden hero-banner">
              <div className="glass-card p-5 relative z-10">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-2">Клиент говорит:</p>
                <p className="text-lg font-medium leading-relaxed text-white">«{selected.clientPhrase}»</p>
                {selected.context && (
                  <p className="text-xs text-white/50 mt-2 italic">{selected.context}</p>
                )}
              </div>
            </div>
          )}

          {/* Голосовой ответ */}
          {!result && (
            <>
              <div className="space-y-3">
                {!audioUrl ? (
                  <button
                    onClick={recording ? stopRecording : startRecording}
                    className={`w-full py-10 rounded-2xl border-2 border-dashed flex flex-col items-center gap-3 transition-all ${
                      recording
                        ? "border-red-400 bg-red-50 text-red-600"
                        : "border-primary/50 bg-mint/20 text-primary hover:border-primary"
                    }`}
                  >
                    <span className={`text-5xl ${recording ? "animate-pulse-soft" : ""}`}>
                      {recording ? "⏹" : "🎤"}
                    </span>
                    <span className="text-sm font-medium">
                      {recording ? "Остановить запись" : "Нажмите и ответьте голосом"}
                    </span>
                    {recording && (
                      <span className="text-xs opacity-70">
                        Говорите — {Math.floor(seconds / 60).toString().padStart(2, "0")}:{(seconds % 60).toString().padStart(2, "0")}
                      </span>
                    )}
                    {!recording && (
                      <span className="text-xs opacity-60">
                        Ответьте так, как ответили бы по телефону
                      </span>
                    )}
                  </button>
                ) : (
                  <div className="p-4 rounded-xl bg-mint/20 border border-primary/20">
                    <p className="text-xs text-primary font-medium mb-2">Запись готова</p>
                    <audio src={audioUrl} controls className="w-full h-8" />
                    <button
                      onClick={() => { setAudioBlob(null); setAudioUrl(null); setSeconds(0); }}
                      className="text-xs text-muted-foreground hover:text-red-600 mt-2"
                    >
                      Записать заново
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || !audioBlob}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary/80 text-white font-semibold text-sm transition-all disabled:opacity-40"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⟳</span> Транскрибирую и анализирую...
                  </span>
                ) : (
                  "Получить оценку"
                )}
              </button>
            </>
          )}

          {result && (
            <button
              onClick={() => { setResult(null); setAudioBlob(null); setAudioUrl(null); setSeconds(0); }}
              className="w-full py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted"
            >
              ← Попробовать снова
            </button>
          )}
        </div>

        {/* Результат */}
        <div className="lg:col-span-3">
          {result ? (
            <div className="space-y-4 animate-fade-in">
              <div className={`p-5 rounded-2xl border ${getScoreBg(result.score)}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider opacity-70">Оценка ответа</p>
                    <p className="text-4xl font-bold">{result.score}<span className="text-xl">/10</span></p>
                  </div>
                  <div className={`px-3 py-2 rounded-xl border text-center ${FEAR_LABELS[result.fearLevel as keyof typeof FEAR_LABELS]?.bg}`}>
                    <p className="text-xs opacity-70">Страх звонков</p>
                    <p className={`text-sm font-bold ${FEAR_LABELS[result.fearLevel as keyof typeof FEAR_LABELS]?.color}`}>
                      {FEAR_LABELS[result.fearLevel as keyof typeof FEAR_LABELS]?.label ?? result.fearLevel}
                    </p>
                  </div>
                </div>
                <p className="text-sm opacity-80">{result.fearDescription}</p>
              </div>

              {/* Характеристики речи */}
              {result.speechCharacteristics && (
                <div className="card-salon p-4">
                  <h3 className="text-sm font-semibold mb-3">Характеристики речи</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(result.speechCharacteristics).map(([key, val]) => {
                      const labels: Record<string, string> = { pace: "Темп", pauses: "Паузы", confidence: "Уверенность", intonation: "Интонация" };
                      return (
                        <div key={key} className="p-2.5 rounded-lg bg-muted">
                          <p className="text-xs text-muted-foreground">{labels[key] ?? key}</p>
                          <p className="text-sm font-medium mt-0.5">{val as string}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {result.parasiteWords?.length > 0 && (
                <div className="card-salon p-4">
                  <h3 className="text-sm font-semibold text-orange-600 mb-2">Слова-паразиты</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.parasiteWords.map((w, i) => (
                      <span key={i} className="px-2 py-1 rounded-lg bg-orange-50 border border-orange-200 text-xs text-orange-700">
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {result.strengths?.length > 0 && (
                  <div className="card-salon p-4">
                    <h3 className="text-sm font-semibold text-primary mb-2">✦ Хорошо</h3>
                    <ul className="space-y-1">
                      {result.strengths.map((s, i) => (
                        <li key={i} className="text-xs flex gap-1.5"><span className="text-primary">✓</span>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.weaknesses?.length > 0 && (
                  <div className="card-salon p-4">
                    <h3 className="text-sm font-semibold text-red-600 mb-2">⚠ Улучшить</h3>
                    <ul className="space-y-1">
                      {result.weaknesses.map((w, i) => (
                        <li key={i} className="text-xs flex gap-1.5"><span className="text-red-500">✕</span>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {result.recommendations?.length > 0 && (
                <div className="card-salon p-4">
                  <h3 className="text-sm font-semibold text-secondary mb-3">Рекомендации</h3>
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
          ) : (
            <div className="h-full flex items-center justify-center text-center p-12 bg-muted/30 rounded-2xl border border-dashed">
              <div>
                <div className="text-5xl mb-4 opacity-30">▷</div>
                <p className="text-muted-foreground text-sm">
                  Запишите голосовой ответ на фразу клиента — AI оценит вашу речь
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
