import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyProdamusSignature } from "@/lib/prodamus";

/**
 * Webhook от Prodamus после оплаты.
 * Prodamus отправляет POST с form-data полями + Sign в заголовке.
 */
export async function POST(req: NextRequest) {
  try {
    // Prodamus может отправлять как form-urlencoded, так и multipart
    const formData = await req.formData();
    const data: Record<string, unknown> = {};
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }

    const signature = req.headers.get("Sign") ?? "";

    // Проверка подписи
    if (!verifyProdamusSignature(data, signature)) {
      console.error("[PRODAMUS] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const orderId = String(data.order_id ?? "");
    const status = String(data.payment_status ?? "");

    if (!orderId) {
      return NextResponse.json({ error: "No order_id" }, { status: 400 });
    }

    // Находим заявку по id
    const paymentRequest = await prisma.paymentRequest.findUnique({
      where: { id: orderId },
    });

    if (!paymentRequest) {
      console.error(`[PRODAMUS] Payment request ${orderId} not found`);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Обрабатываем только успешную оплату
    if (status !== "success") {
      console.log(`[PRODAMUS] Payment ${orderId} status: ${status}`);
      return NextResponse.json({ ok: true });
    }

    // Активируем подписку: добавляем месяцы к текущей дате
    const user = await prisma.user.findUnique({ where: { id: paymentRequest.userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const baseDate = user.subscriptionEndsAt && user.subscriptionEndsAt > new Date()
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
        where: { id: paymentRequest.id },
        data: { status: "CONFIRMED" },
      }),
    ]);

    console.log(`[PRODAMUS] Subscription activated for user ${user.id} until ${newEndDate}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PRODAMUS] Webhook error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
