import { openai } from "@/lib/openai-client";
import { toFile } from "openai";
import { writeFile, readFile, unlink } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);

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

const WHISPER_NATIVE_EXTS = new Set([
  "mp3", "mp4", "m4a", "wav", "ogg", "flac", "webm", "mpeg", "mpga", "oga",
]);

function needsConversion(buffer: Buffer): boolean {
  // AAC ADTS (raw AAC without MP4 container) — Whisper can't handle this
  if (buffer[0] === 0xff && (buffer[1] & 0xf0) === 0xf0) return true;
  if (buffer[0] === 0xff && (buffer[1] & 0xf6) === 0xf0) return true;
  return false;
}

async function convertToMp3(inputPath: string, outputPath: string): Promise<void> {
  await execFileAsync("ffmpeg", [
    "-y", "-i", inputPath,
    "-vn", "-ar", "16000", "-ac", "1", "-b:a", "64k",
    "-f", "mp3", outputPath,
  ], { timeout: 120_000 });
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  fileName: string,
  language = "ru"
): Promise<TranscriptionResult> {
  const origExt = fileName.split(".").pop()?.toLowerCase() ?? "";
  let ext = WHISPER_NATIVE_EXTS.has(origExt) ? origExt : "mp3";
  let finalBuffer = audioBuffer;
  let finalName = WHISPER_NATIVE_EXTS.has(origExt) ? fileName : `audio.${ext}`;

  // Convert raw AAC or unsupported formats to MP3 via ffmpeg
  if (needsConversion(audioBuffer)) {
    console.log(`[TRANSCRIBE] Converting ${fileName} (raw AAC) to MP3 via ffmpeg`);
    const tmpIn = path.join(os.tmpdir(), `in_${Date.now()}.${origExt || "aac"}`);
    const tmpOut = path.join(os.tmpdir(), `out_${Date.now()}.mp3`);
    try {
      await writeFile(tmpIn, audioBuffer);
      await convertToMp3(tmpIn, tmpOut);
      finalBuffer = await readFile(tmpOut);
      ext = "mp3";
      finalName = fileName.replace(/\.[^.]+$/, ".mp3");
      console.log(`[TRANSCRIBE] Converted: ${finalBuffer.length} bytes`);
    } finally {
      await unlink(tmpIn).catch(() => {});
      await unlink(tmpOut).catch(() => {});
    }
  }

  const mimeMap: Record<string, string> = {
    mp3: "audio/mpeg", mp4: "audio/mp4", m4a: "audio/mp4",
    wav: "audio/wav", ogg: "audio/ogg", flac: "audio/flac",
    webm: "audio/webm", mpeg: "audio/mpeg", mpga: "audio/mpeg", oga: "audio/ogg",
  };
  const mime = mimeMap[ext] ?? "audio/mpeg";

  // If proxy is configured, use dedicated transcribe endpoint on Vercel
  const proxyUrl = process.env.OPENAI_PROXY_URL;
  const proxySecret = process.env.OPENAI_PROXY_SECRET;

  let transcription;

  if (proxyUrl && proxySecret) {
    console.log(`[TRANSCRIBE] Sending ${finalName} (${finalBuffer.length} bytes) via proxy`);
    const form = new FormData();
    const blob = new Blob([finalBuffer], { type: mime });
    form.append("file", blob, finalName);
    form.append("fileName", finalName);
    form.append("model", "whisper-1");
    form.append("language", language);
    form.append("response_format", "verbose_json");

    const res = await fetch(`${proxyUrl}/api/transcribe-proxy`, {
      method: "POST",
      headers: { "x-proxy-secret": proxySecret },
      body: form,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error ?? `Proxy error: ${res.status}`);
    }

    transcription = await res.json();
  } else {
    // Direct call
    const file = await toFile(finalBuffer, finalName, { type: mime });
    transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language,
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });
  }

  const processedSegments = processSegmentsWithSpeakers(transcription.segments ?? []);

  return {
    text: transcription.text,
    segments: processedSegments,
    duration: transcription.duration,
  };
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

  let currentSpeaker = "Администратор";
  let previousEnd = 0;

  return segments.map((segment) => {
    const gap = segment.start - previousEnd;
    if (gap > 0.5 && previousEnd > 0) {
      currentSpeaker = currentSpeaker === "Администратор" ? "Клиент" : "Администратор";
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

export function formatTranscriptionForAnalysis(result: TranscriptionResult): string {
  if (!result.segments?.length) return result.text;

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
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav",
  "audio/ogg", "audio/mp4", "audio/x-m4a", "audio/aac",
  "audio/webm", "video/webm",
];

export const MAX_AUDIO_SIZE = 100 * 1024 * 1024;
