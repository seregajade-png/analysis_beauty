import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateAdminCard } from "@/lib/ai/analyzer";
import { randomBytes } from "crypto";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const token = searchParams.get("token");

  // Публичный доступ по токену
  if (token) {
    const card = await prisma.adminCard.findFirst({
      where: { shareToken: token, isShared: true },
    });
    if (!card) {
      return NextResponse.json({ error: "Карточка не найдена" }, { status: 404 });
    }
    return NextResponse.json(card);
  }

  if (id) {
    const card = await prisma.adminCard.findFirst({
      where: {
        id,
        OR: [
          { userId: session.user.id },
          { user: { managerId: session.user.id } },
        ],
      },
    });
    if (!card) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }
    return NextResponse.json(card);
  }

  // Список карточек
  const whereClause =
    session.user.role === "ADMIN"
      ? { userId: session.user.id }
      : session.user.role === "MANAGER"
      ? { user: { managerId: session.user.id } }
      : {}; // OWNER видит все

  const cards = await prisma.adminCard.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { name: true, email: true },
      },
    },
  });

  return NextResponse.json(cards);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  try {
    const { userId, adminName } = await req.json();
    const targetUserId = userId || session.user.id;

    // Собираем данные для карточки
    const [callResults, chatResults, testResults] = await Promise.all([
      prisma.callAnalysis.findMany({
        where: { userId: targetUserId, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          overallScore: true,
          stageScores: true,
          analysisResult: true,
        },
      }),
      prisma.chatAnalysis.findMany({
        where: { userId: targetUserId, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          overallScore: true,
          stageScores: true,
          analysisResult: true,
        },
      }),
      prisma.testResult.findMany({
        where: { userId: targetUserId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Группируем тесты по типу (берём последний)
    const latestTests = testResults.reduce(
      (acc, test) => {
        if (!acc[test.testType]) acc[test.testType] = test;
        return acc;
      },
      {} as Record<string, (typeof testResults)[0]>
    );

    const testSummary = {
      practicalCase: latestTests["PRACTICAL_CASE"]
        ? {
            score: latestTests["PRACTICAL_CASE"].score ?? 0,
            feedback: latestTests["PRACTICAL_CASE"].feedback ?? "",
          }
        : undefined,
      roleplay: latestTests["ROLEPLAY"]
        ? {
            score: latestTests["ROLEPLAY"].score ?? 0,
            fearLevel: latestTests["ROLEPLAY"].fearLevel ?? "medium",
            feedback: latestTests["ROLEPLAY"].feedback ?? "",
          }
        : undefined,
      productKnowledge: latestTests["PRODUCT_KNOWLEDGE"]
        ? {
            score: latestTests["PRODUCT_KNOWLEDGE"].score ?? 0,
            weakAreas: latestTests["PRODUCT_KNOWLEDGE"].weakAreas,
          }
        : undefined,
      crmKnowledge: latestTests["CRM_KNOWLEDGE"]
        ? {
            score: latestTests["CRM_KNOWLEDGE"].score ?? 0,
            feedback: latestTests["CRM_KNOWLEDGE"].feedback ?? "",
          }
        : undefined,
    };

    // Генерируем карточку через AI
    const cardData = await generateAdminCard({
      adminName: adminName || session.user.name || "Администратор",
      callResults: callResults.map((r) => ({
        score: r.overallScore ?? 0,
        stages: [],
      })),
      chatResults: chatResults.map((r) => ({
        score: r.overallScore ?? 0,
        stages: [],
      })),
      testResults: testSummary,
    });

    // Сводные данные
    const callSummary =
      callResults.length > 0
        ? {
            totalCalls: callResults.length,
            avgScore:
              callResults.reduce((s, r) => s + (r.overallScore ?? 0), 0) /
              callResults.length,
            mainIssues: [],
          }
        : undefined;

    const chatSummary =
      chatResults.length > 0
        ? {
            totalChats: chatResults.length,
            avgScore:
              chatResults.reduce((s, r) => s + (r.overallScore ?? 0), 0) /
              chatResults.length,
            mainIssues: [],
          }
        : undefined;

    // Сохраняем карточку
    const card = await prisma.adminCard.create({
      data: {
        userId: targetUserId,
        adminName: adminName || session.user.name || "Администратор",
        salonName: session.user.salonName ?? undefined,
        overallScore: cardData.overallScore,
        skills: cardData.skills as object,
        callSummary: callSummary as object | undefined,
        chatSummary: chatSummary as object | undefined,
        testSummary: testSummary as object,
        developmentPlan: cardData.developmentPlan as object,
      },
    });

    return NextResponse.json({ success: true, card, cardData });
  } catch (error) {
    console.error("Admin card generation error:", error);
    return NextResponse.json(
      { error: "Ошибка при генерации карточки" },
      { status: 500 }
    );
  }
}

// Создать публичную ссылку
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id, share } = await req.json();

  const card = await prisma.adminCard.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!card) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  const shareToken = share
    ? card.shareToken ?? randomBytes(16).toString("hex")
    : null;

  const updated = await prisma.adminCard.update({
    where: { id },
    data: { isShared: share, shareToken },
  });

  return NextResponse.json({
    shareToken: updated.shareToken,
    shareUrl: shareToken
      ? `${process.env.NEXTAUTH_URL}/admin-card?token=${shareToken}`
      : null,
  });
}
