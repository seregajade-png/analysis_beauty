import { toFile } from "openai";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";
import { writeFile, unlink, readFile } from "fs/promises";
import path from "path";
import os from "os";
import { openai } from "@/lib/openai-client";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

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

// Форматы, которые Whisper принимает нативно
const WHISPER_NATIVE_EXTS = new Set([
  "mp3", "mp4", "m4a", "wav", "ogg", "flac", "webm", "mpeg", "mpga", "oga",
]);

function detectAudioExt(buffer: Buffer, fileName: string): string {
  // AAC ADTS — не поддерживается Whisper, нужна конвертация
  if (buffer[0] === 0xff && (buffer[1] & 0xf0) === 0xf0) return "aac";
  // MP3
  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) return "mp3";
  if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) return "mp3"; // ID3
  // ftyp (MP4/M4A)
  if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) return "m4a";
  // OGG
  if (buffer[0] === 0x4f && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) return "ogg";
  // FLAC
  if (buffer[0] === 0x66 && buffer[1] === 0x4c && buffer[2] === 0x61 && buffer[3] === 0x43) return "flac";
  // RIFF (WAV)
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) return "wav";
  // WebM
  if (buffer[0] === 0x1a && buffer[1] === 0x45) return "webm";

  return fileName.split(".").pop()?.toLowerCase() ?? "mp3";
}

async function convertToMp3(inputPath: string): Promise<Buffer> {
  const outputPath = inputPath.replace(/\.[^.]+$/, "_converted.mp3");
  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .audioCodec("libmp3lame")
      .audioBitrate(128)
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });
  const buf = await readFile(outputPath);
  await unlink(outputPath).catch(() => {});
  return buf;
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  fileName: string,
  language = "ru"
): Promise<TranscriptionResult> {
  const ext = detectAudioExt(audioBuffer, fileName);
  const tempPath = path.join(os.tmpdir(), `audio_${Date.now()}.${ext}`);
  await writeFile(tempPath, audioBuffer);

  let finalBuffer = audioBuffer;
  let finalExt = ext;

  try {
    if (!WHISPER_NATIVE_EXTS.has(ext)) {
      finalBuffer = await convertToMp3(tempPath);
      finalExt = "mp3";
    }

    const mimeMap: Record<string, string> = {
      mp3: "audio/mpeg", mp4: "audio/mp4", m4a: "audio/mp4",
      wav: "audio/wav", ogg: "audio/ogg", flac: "audio/flac",
      webm: "audio/webm", mpeg: "audio/mpeg", mpga: "audio/mpeg", oga: "audio/ogg",
    };
    const mime = mimeMap[finalExt] ?? "audio/mpeg";

    const file = await toFile(finalBuffer, `audio.${finalExt}`, { type: mime });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language,
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    const processedSegments = processSegmentsWithSpeakers(
      transcription.segments ?? []
    );

    return {
      text: transcription.text,
      segments: processedSegments,
      duration: transcription.duration,
    };
  } finally {
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

  let currentSpeaker = "Администратор";
  let previousEnd = 0;

  return segments.map((segment) => {
    const gap = segment.start - previousEnd;

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
  "video/webm",
];

export const MAX_AUDIO_SIZE = 100 * 1024 * 1024; // 100 MB
