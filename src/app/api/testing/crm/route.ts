import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzeCRMKnowledge } from "@/lib/ai/analyzer";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  try {
    const { answers } = await req.json();

    if (!answers?.length) {
      return NextResponse.json(
        { error: "Ответы обязательны" },
        { status: 400 }
      );
    }

    const result = await analyzeCRMKnowledge(
      answers,
      session.user.name ?? undefined
    );

    const testResult = await prisma.testResult.create({
      data: {
        userId: session.user.id,
        testType: "CRM_KNOWLEDGE",
        inputText: JSON.stringify(answers),
        score: result.score,
        analysisResult: result as object,
        feedback: result.feedback,
        weakAreas: result.weakAreas,
      },
    });

    return NextResponse.json({ success: true, testResult, result });
  } catch (error) {
    console.error("CRM test error:", error);
    return NextResponse.json(
      { error: "Ошибка при анализе теста CRM" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const settings = await prisma.salonSettings.findFirst({
    where: {
      OR: [
        { userId: session.user.id },
        { user: { managedAdmins: { some: { id: session.user.id } } } },
      ],
    },
    include: {
      crmQuestions: {
        where: { isActive: true },
        orderBy: { order: "asc" },
      },
    },
  });

  return NextResponse.json(settings?.crmQuestions ?? []);
}
