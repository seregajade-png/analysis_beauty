import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccessInfo, SUBSCRIPTION_PRICE_RUB } from "@/lib/subscription";
import { buildProdamusPaymentUrl } from "@/lib/prodamus";

// Получить статус подписки и историю заявок
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const access = await getAccessInfo(session.user.id);

  const requests = await prisma.paymentRequest.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json({
    access,
    requests,
    price: SUBSCRIPTION_PRICE_RUB,
  });
}

// Создать заявку на оплату + ссылку Prodamus
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const months = Math.max(1, Math.min(12, Number(body.months ?? 1)));

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, phone: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    const amount = SUBSCRIPTION_PRICE_RUB * months;

    const paymentRequest = await prisma.paymentRequest.create({
      data: {
        userId: session.user.id,
        amount,
        months,
        status: "PENDING",
      },
    });

    // Генерируем ссылку на оплату Prodamus
    const baseUrl = process.env.NEXTAUTH_URL ?? "https://beauty.natolisova.ru";
    const paymentUrl = buildProdamusPaymentUrl({
      orderId: paymentRequest.id,
      amount,
      description: `BeautyChief — подписка ${months} мес.`,
      customerEmail: user.email,
      customerPhone: user.phone ?? undefined,
      successUrl: `${baseUrl}/subscription?paid=1`,
      webhookUrl: `${baseUrl}/api/payment/prodamus`,
    });

    return NextResponse.json({
      success: true,
      request: paymentRequest,
      paymentUrl,
    });
  } catch (error) {
    console.error("[SUBSCRIPTION] Error:", error);
    return NextResponse.json({ error: "Ошибка создания заявки" }, { status: 500 });
  }
}

// Подтвердить заявку (только для OWNER/MANAGER — админка платежей)
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Нет прав" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const requestId = String(body.requestId ?? "");
    const action = String(body.action ?? ""); // "confirm" | "reject"

    if (!requestId || !["confirm", "reject"].includes(action)) {
      return NextResponse.json({ error: "Неверные параметры" }, { status: 400 });
    }

    const paymentRequest = await prisma.paymentRequest.findUnique({
      where: { id: requestId },
    });

    if (!paymentRequest) {
      return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
    }

    if (action === "confirm") {
      // Активируем подписку: добавляем месяцы к текущей дате (или к существующему окончанию)
      const user = await prisma.user.findUnique({ where: { id: paymentRequest.userId } });
      const baseDate = user?.subscriptionEndsAt && user.subscriptionEndsAt > new Date()
        ? user.subscriptionEndsAt
        : new Date();
      const newEndDate = new Date(baseDate.getTime() + paymentRequest.months * 30 * 24 * 60 * 60 * 1000);

      await prisma.$transaction([
        prisma.user.update({
          where: { id: paymentRequest.userId },
          data: {
            subscriptionStatus: "ACTIVE",
            subscriptionEndsAt: newEndDate,
          },
        }),
        prisma.paymentRequest.update({
          where: { id: requestId },
          data: { status: "CONFIRMED" },
        }),
      ]);
    } else {
      await prisma.paymentRequest.update({
        where: { id: requestId },
        data: { status: "REJECTED" },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SUBSCRIPTION PATCH] Error:", error);
    return NextResponse.json({ error: "Ошибка обработки" }, { status: 500 });
  }
}
