import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzeRoleplay } from "@/lib/ai/analyzer";
import { transcribeAudio } from "@/lib/audio/transcribe";
import { writeFile, mkdir, readFile } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  try {
    const contentType = req.headers.get("content-type") ?? "";
    let clientPhrase = "";
    let adminResponse = "";
    let audioUrl: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      clientPhrase = (formData.get("clientPhrase") as string) ?? "";
      const audioFile = formData.get("audio") as File;
      const textResponse = formData.get("textResponse") as string;

      if (audioFile && audioFile.size > 0) {
        // Сохраняем аудио и транскрибируем
        const bytes = await audioFile.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uploadDir = path.join(
          process.cwd(),
          "public",
          "uploads",
          "roleplay"
        );
        await mkdir(uploadDir, { recursive: true });

        const fileName = `${Date.now()}_roleplay.webm`;
        const filePath = path.join(uploadDir, fileName);
        await writeFile(filePath, buffer);
        audioUrl = `/uploads/roleplay/${fileName}`;

        // Транскрибируем
        const transcription = await transcribeAudio(buffer, fileName);
        adminResponse = transcription.text;
      } else if (textResponse) {
        adminResponse = textResponse;
      }
    } else {
      const body = await req.json();
      clientPhrase = body.clientPhrase ?? "";
      adminResponse = body.adminResponse ?? "";
    }

    if (!clientPhrase || !adminResponse) {
      return NextResponse.json(
        { error: "Фраза клиента и ответ администратора обязательны" },
        { status: 400 }
      );
    }

    // AI анализ
    const result = await analyzeRoleplay(
      clientPhrase,
      adminResponse,
      session.user.name ?? undefined
    );

    // Сохраняем
    const testResult = await prisma.testResult.create({
      data: {
        userId: session.user.id,
        testType: "ROLEPLAY",
        inputText: adminResponse,
        audioUrl,
        score: result.score,
        fearLevel: result.fearLevel,
        analysisResult: result as object,
        feedback: result.feedback,
        weakAreas: result.weaknesses,
      },
    });

    return NextResponse.json({ success: true, testResult, result });
  } catch (error) {
    console.error("Roleplay analysis error:", error);
    return NextResponse.json(
      { error: "Ошибка при анализе ролевой игры" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  // Получаем сценарии
  const settings = await prisma.salonSettings.findFirst({
    where: {
      OR: [
        { userId: session.user.id },
        { user: { managedAdmins: { some: { id: session.user.id } } } },
      ],
    },
    include: {
      roleplayScenarios: {
        where: { isActive: true },
        orderBy: { difficulty: "asc" },
      },
    },
  });

  return NextResponse.json(settings?.roleplayScenarios ?? []);
}
