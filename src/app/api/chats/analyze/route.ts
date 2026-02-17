import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzeChat, extractTextFromScreenshots } from "@/lib/ai/analyzer";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  try {
    const contentType = req.headers.get("content-type") ?? "";

    let chatText = "";
    let source = "TEXT";
    let adminName = "";
    let title = "";
    const imagesBase64: { base64: string; mimeType: string }[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      chatText = (formData.get("text") as string) ?? "";
      source = (formData.get("source") as string) ?? "TEXT";
      adminName = (formData.get("adminName") as string) ?? "";
      title = (formData.get("title") as string) ?? "";

      // Читаем изображения в base64
      const files = formData.getAll("images") as File[];
      for (const file of files) {
        if (file.size > 0) {
          const bytes = await file.arrayBuffer();
          const base64 = Buffer.from(bytes).toString("base64");
          imagesBase64.push({ base64, mimeType: file.type || "image/jpeg" });
        }
      }

      // Если нет текста но есть скриншоты — извлекаем текст через GPT Vision
      if (!chatText.trim() && imagesBase64.length > 0) {
        chatText = await extractTextFromScreenshots(imagesBase64);
        source = "SCREENSHOT";
      }
    } else {
      const body = await req.json();
      chatText = body.text ?? "";
      source = body.source ?? "TEXT";
      adminName = body.adminName ?? "";
      title = body.title ?? "";
    }

    if (!chatText.trim()) {
      return NextResponse.json(
        { error: "Текст переписки не предоставлен" },
        { status: 400 }
      );
    }

    // Создаём запись
    const record = await prisma.chatAnalysis.create({
      data: {
        userId: session.user.id,
        adminName: adminName || session.user.name,
        title: title || "Переписка",
        source: source as
          | "WHATSAPP"
          | "TELEGRAM"
          | "INSTAGRAM"
          | "TEXT"
          | "SCREENSHOT",
        rawText: chatText,
        imageUrls: [],
        status: "ANALYZING",
      },
    });

    // AI анализ
    try {
      const result = await analyzeChat(chatText, adminName || undefined, source);

      const stageScores = result.stages.reduce(
        (acc: Record<string, number>, stage) => {
          acc[stage.key] = stage.score;
          return acc;
        },
        {}
      );

      const updated = await prisma.chatAnalysis.update({
        where: { id: record.id },
        data: {
          status: "COMPLETED",
          overallScore: result.overallScore,
          analysisResult: result as object,
          stageScores,
        },
      });

      return NextResponse.json({
        success: true,
        analysis: updated,
        result,
      });
    } catch (error) {
      await prisma.chatAnalysis.update({
        where: { id: record.id },
        data: {
          status: "FAILED",
          errorMessage: String(error),
        },
      });
      throw error;
    }
  } catch (error) {
    console.error("Chat analysis error:", error);
    return NextResponse.json(
      { error: "Ошибка при анализе переписки" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const analysis = await prisma.chatAnalysis.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!analysis) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }
    return NextResponse.json(analysis);
  }

  const analyses = await prisma.chatAnalysis.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      adminName: true,
      title: true,
      source: true,
      status: true,
      overallScore: true,
      createdAt: true,
    },
  });

  return NextResponse.json(analyses);
}
