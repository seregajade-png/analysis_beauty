import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzeProductKnowledge } from "@/lib/ai/analyzer";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  try {
    const { productId, answers } = await req.json();

    if (!productId || !answers?.length) {
      return NextResponse.json(
        { error: "productId и answers обязательны" },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Продукт не найден" },
        { status: 404 }
      );
    }

    const result = await analyzeProductKnowledge(
      {
        name: product.name,
        characteristics: product.characteristics,
        advantages: product.advantages,
        benefits: product.benefits,
        price: product.price ?? undefined,
        targetAudience: product.targetAudience ?? undefined,
        objections: product.objections as Record<string, string> | undefined,
      },
      answers
    );

    const testResult = await prisma.testResult.create({
      data: {
        userId: session.user.id,
        testType: "PRODUCT_KNOWLEDGE",
        inputText: JSON.stringify(answers),
        score: result.score,
        analysisResult: { ...result, productId, productName: product.name } as object,
        feedback: result.feedback,
        weakAreas: result.weakAreas,
      },
    });

    return NextResponse.json({ success: true, testResult, result });
  } catch (error) {
    console.error("Product test error:", error);
    return NextResponse.json(
      { error: "Ошибка при анализе теста" },
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
      products: {
        where: { isActive: true },
        orderBy: { name: "asc" },
      },
    },
  });

  return NextResponse.json(settings?.products ?? []);
}
