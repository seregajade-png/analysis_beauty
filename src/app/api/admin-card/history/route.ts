import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const userId = session.user.id;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // calls, chats, tests
  const id = searchParams.get("id");

  // Получить конкретную запись по id
  if (id && type === "calls") {
    const item = await prisma.callAnalysis.findFirst({ where: { id, userId } });
    return item
      ? NextResponse.json(item)
      : NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }
  if (id && type === "chats") {
    const item = await prisma.chatAnalysis.findFirst({ where: { id, userId } });
    return item
      ? NextResponse.json(item)
      : NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }
  if (id && type === "tests") {
    const item = await prisma.testResult.findFirst({ where: { id, userId } });
    return item
      ? NextResponse.json(item)
      : NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  // Получить списки по типу
  if (type === "calls") {
    const calls = await prisma.callAnalysis.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, title: true, adminName: true, overallScore: true,
        duration: true, createdAt: true,
      },
    });
    return NextResponse.json(calls);
  }

  if (type === "chats") {
    const chats = await prisma.chatAnalysis.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, title: true, adminName: true, source: true,
        overallScore: true, createdAt: true,
      },
    });
    return NextResponse.json(chats);
  }

  if (type === "tests") {
    const tests = await prisma.testResult.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, testType: true, score: true, fearLevel: true,
        feedback: true, createdAt: true,
      },
    });
    return NextResponse.json(tests);
  }

  // По умолчанию — сводка по всему
  const [calls, chats, tests] = await Promise.all([
    prisma.callAnalysis.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, title: true, adminName: true, overallScore: true,
        duration: true, createdAt: true,
      },
    }),
    prisma.chatAnalysis.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, title: true, adminName: true, source: true,
        overallScore: true, createdAt: true,
      },
    }),
    prisma.testResult.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, testType: true, score: true, fearLevel: true,
        feedback: true, createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({ calls, chats, tests });
}
