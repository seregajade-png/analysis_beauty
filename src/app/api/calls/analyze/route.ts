import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  transcribeAudio,
  formatTranscriptionForAnalysis,
  ALLOWED_AUDIO_TYPES,
  MAX_AUDIO_SIZE,
} from "@/lib/audio/transcribe";
import { analyzeCall } from "@/lib/ai/analyzer";

export const maxDuration = 300; // 5 minutes for long audio

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  try {
    const contentType = req.headers.get("content-type") ?? "";

    // New flow: FormData with audio file (upload + analyze in one request)
    if (contentType.includes("multipart/form-data")) {
      return handleFullAnalysis(req, session.user.id!, session.user.name);
    }

    // Legacy flow: JSON with analysisId (kept for compatibility)
    const { analysisId } = await req.json();
    if (!analysisId) {
      return NextResponse.json({ error: "analysisId обязателен" }, { status: 400 });
    }

    const analysis = await prisma.callAnalysis.findFirst({
      where: { id: analysisId, userId: session.user.id },
    });
    if (!analysis) {
      return NextResponse.json({ error: "Анализ не найден" }, { status: 404 });
    }

    // For legacy flow, audioBuffer must have been stored — this won't work on Vercel
    return NextResponse.json(
      { error: "Используйте новый формат загрузки (FormData)" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера: " + String(error) },
      { status: 500 }
    );
  }
}

async function handleFullAnalysis(
  req: NextRequest,
  userId: string,
  userName: string | null | undefined
) {
  const formData = await req.formData();
  const file = formData.get("audio") as File;
  const adminName = (formData.get("adminName") as string) || userName || "";
  const title = (formData.get("title") as string) || file?.name || "Звонок";

  if (!file) {
    return NextResponse.json({ error: "Файл не предоставлен" }, { status: 400 });
  }

  if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Неподдерживаемый формат. Разрешены: mp3, wav, ogg, m4a, aac" },
      { status: 400 }
    );
  }

  if (file.size > MAX_AUDIO_SIZE) {
    return NextResponse.json(
      { error: "Файл слишком большой. Максимум 100 МБ" },
      { status: 400 }
    );
  }

  // Create DB record
  const analysis = await prisma.callAnalysis.create({
    data: {
      userId,
      adminName,
      title,
      audioFileName: file.name,
      status: "TRANSCRIBING",
    },
  });

  const audioBuffer = Buffer.from(await file.arrayBuffer());

  // Transcription
  let transcriptionResult;
  try {
    transcriptionResult = await transcribeAudio(audioBuffer, file.name);
  } catch (error) {
    await prisma.callAnalysis.update({
      where: { id: analysis.id },
      data: { status: "FAILED", errorMessage: "Ошибка транскрипции: " + String(error) },
    });
    return NextResponse.json(
      { error: "Ошибка при транскрипции аудио: " + String(error) },
      { status: 500 }
    );
  }

  const formattedTranscription = formatTranscriptionForAnalysis(transcriptionResult);

  await prisma.callAnalysis.update({
    where: { id: analysis.id },
    data: {
      status: "ANALYZING",
      transcription: formattedTranscription,
      speakerLabels: transcriptionResult.segments ?? [],
      duration: Math.round(transcriptionResult.duration ?? 0),
    },
  });

  // AI analysis
  let analysisResult;
  try {
    analysisResult = await analyzeCall(formattedTranscription, adminName || undefined);
  } catch (error) {
    await prisma.callAnalysis.update({
      where: { id: analysis.id },
      data: { status: "FAILED", errorMessage: "Ошибка AI анализа: " + String(error) },
    });
    return NextResponse.json(
      { error: "Ошибка при AI анализе: " + String(error) },
      { status: 500 }
    );
  }

  // Save result
  const stageScores = analysisResult.stages.reduce(
    (acc: Record<string, number>, stage) => {
      acc[stage.key] = stage.score;
      return acc;
    },
    {}
  );

  const updatedAnalysis = await prisma.callAnalysis.update({
    where: { id: analysis.id },
    data: {
      status: "COMPLETED",
      overallScore: analysisResult.overallScore,
      analysisResult: analysisResult as object,
      stageScores,
    },
  });

  return NextResponse.json({
    success: true,
    analysis: updatedAnalysis,
    result: analysisResult,
  });
}

// GET — history and single analysis
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const analysis = await prisma.callAnalysis.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!analysis) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }
    return NextResponse.json(analysis);
  }

  const analyses = await prisma.callAnalysis.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      adminName: true,
      title: true,
      status: true,
      overallScore: true,
      duration: true,
      createdAt: true,
    },
  });

  return NextResponse.json(analyses);
}
