import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzePracticalCase } from "@/lib/ai/analyzer";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  try {
    const { caseId, response: adminResponse } = await req.json();

    if (!adminResponse?.trim()) {
      return NextResponse.json(
        { error: "Ответ не предоставлен" },
        { status: 400 }
      );
    }

    // Получаем кейс из БД (или используем дефолтный)
    let scenario =
      "Вам звонит клиент, который был у вас полгода назад. Напишите полный диалог — как вы построите разговор.";

    if (caseId) {
      const practicalCase = await prisma.practicalCase.findUnique({
        where: { id: caseId },
      });
      if (practicalCase) {
        scenario = practicalCase.scenario;
      }
    }

    // AI анализ — не передаём имя из сессии, AI определит имя из текста диалога
    const result = await analyzePracticalCase(
      scenario,
      adminResponse
    );

    // Сохраняем результат
    const testResult = await prisma.testResult.create({
      data: {
        userId: session.user.id,
        testType: "PRACTICAL_CASE",
        caseId: caseId ?? null,
        inputText: adminResponse,
        score: result.score,
        analysisResult: result as object,
        feedback: result.feedback,
        weakAreas: result.weaknesses,
      },
    });

    return NextResponse.json({ success: true, testResult, result });
  } catch (error) {
    console.error("Case analysis error:", error);
    return NextResponse.json(
      { error: "Ошибка при анализе ответа" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  // Получаем доступные кейсы
  const settings = await prisma.salonSettings.findFirst({
    where: {
      OR: [
        { userId: session.user.id },
        { user: { managedAdmins: { some: { id: session.user.id } } } },
      ],
    },
    include: {
      cases: {
        where: { isActive: true },
        orderBy: { difficulty: "asc" },
      },
    },
  });

  return NextResponse.json(settings?.cases ?? []);
}
