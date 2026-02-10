import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  transcribeAudio,
  formatTranscriptionForAnalysis,
} from "@/lib/audio/transcribe";
import { analyzeCall } from "@/lib/ai/analyzer";
import { readFile } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  try {
    const { analysisId } = await req.json();

    if (!analysisId) {
      return NextResponse.json(
        { error: "analysisId обязателен" },
        { status: 400 }
      );
    }

    const analysis = await prisma.callAnalysis.findFirst({
      where: { id: analysisId, userId: session.user.id },
    });

    if (!analysis) {
      return NextResponse.json(
        { error: "Анализ не найден" },
        { status: 404 }
      );
    }

    if (!analysis.audioUrl) {
      return NextResponse.json(
        { error: "Аудиофайл не найден" },
        { status: 400 }
      );
    }

    // Обновляем статус
    await prisma.callAnalysis.update({
      where: { id: analysisId },
      data: { status: "TRANSCRIBING" },
    });

    // Читаем аудиофайл
    const filePath = path.join(process.cwd(), "public", analysis.audioUrl);
    const audioBuffer = await readFile(filePath);

    // Транскрипция
    let transcriptionResult;
    try {
      transcriptionResult = await transcribeAudio(
        audioBuffer,
        analysis.audioFileName ?? "audio.mp3"
      );
    } catch (error) {
      await prisma.callAnalysis.update({
        where: { id: analysisId },
        data: {
          status: "FAILED",
          errorMessage: "Ошибка транскрипции: " + String(error),
        },
      });
      return NextResponse.json(
        { error: "Ошибка при транскрипции аудио" },
        { status: 500 }
      );
    }

    const formattedTranscription = formatTranscriptionForAnalysis(
      transcriptionResult
    );

    // Обновляем статус и сохраняем транскрипцию
    await prisma.callAnalysis.update({
      where: { id: analysisId },
      data: {
        status: "ANALYZING",
        transcription: formattedTranscription,
        speakerLabels: transcriptionResult.segments ?? [],
        duration: Math.round(transcriptionResult.duration ?? 0),
      },
    });

    // AI анализ
    let analysisResult;
    try {
      analysisResult = await analyzeCall(
        formattedTranscription,
        analysis.adminName ?? undefined
      );
    } catch (error) {
      await prisma.callAnalysis.update({
        where: { id: analysisId },
        data: {
          status: "FAILED",
          errorMessage: "Ошибка AI анализа: " + String(error),
        },
      });
      return NextResponse.json(
        { error: "Ошибка при AI анализе" },
        { status: 500 }
      );
    }

    // Сохраняем результат
    const stageScores = analysisResult.stages.reduce(
      (acc: Record<string, number>, stage) => {
        acc[stage.key] = stage.score;
        return acc;
      },
      {}
    );

    const updatedAnalysis = await prisma.callAnalysis.update({
      where: { id: analysisId },
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
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

// GET — получение статуса и результата
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

  // Список всех анализов пользователя
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
