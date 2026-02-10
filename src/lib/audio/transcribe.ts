import OpenAI from "openai";
import { createReadStream } from "fs";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface TranscriptionResult {
  text: string;
  segments?: Array<{
    id: number;
    start: number;
    end: number;
    text: string;
    speaker?: string;
  }>;
  duration?: number;
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  fileName: string,
  language = "ru"
): Promise<TranscriptionResult> {
  // Сохраняем файл во временную директорию
  const tempPath = path.join(os.tmpdir(), `audio_${Date.now()}_${fileName}`);

  try {
    await writeFile(tempPath, audioBuffer);

    const file = createReadStream(tempPath);

    // Используем verbose_json для получения временных меток
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language,
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    // Пытаемся определить спикеров (простая эвристика)
    const processedSegments = processSegmentsWithSpeakers(
      transcription.segments ?? []
    );

    return {
      text: transcription.text,
      segments: processedSegments,
      duration: transcription.duration,
    };
  } finally {
    // Удаляем временный файл
    await unlink(tempPath).catch(() => {});
  }
}

interface WhisperSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

function processSegmentsWithSpeakers(
  segments: WhisperSegment[]
): TranscriptionResult["segments"] {
  if (!segments.length) return [];

  // Простая эвристика для определения смены спикера:
  // - Пауза > 1 секунды между репликами = смена спикера
  // - Чередуем: первый спикер = Администратор, второй = Клиент
  let currentSpeaker = "Администратор";
  let previousEnd = 0;

  return segments.map((segment) => {
    const gap = segment.start - previousEnd;

    // Если пауза > 0.5 секунды, считаем что это смена спикера
    if (gap > 0.5 && previousEnd > 0) {
      currentSpeaker =
        currentSpeaker === "Администратор" ? "Клиент" : "Администратор";
    }

    previousEnd = segment.end;

    return {
      id: segment.id,
      start: segment.start,
      end: segment.end,
      text: segment.text,
      speaker: currentSpeaker,
    };
  });
}

export function formatTranscriptionForAnalysis(
  result: TranscriptionResult
): string {
  if (!result.segments?.length) {
    return result.text;
  }

  // Форматируем в читаемый вид с таймкодами и спикерами
  let formatted = "";
  let currentSpeaker = "";

  for (const segment of result.segments) {
    if (segment.speaker !== currentSpeaker) {
      currentSpeaker = segment.speaker ?? "Спикер";
      formatted += `\n[${currentSpeaker}]: `;
    }

    const timecode = formatTimecode(segment.start);
    formatted += `[${timecode}] ${segment.text.trim()} `;
  }

  return formatted.trim();
}

function formatTimecode(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/webm",
  "video/webm", // браузерная запись
];

export const MAX_AUDIO_SIZE = 100 * 1024 * 1024; // 100 MB
