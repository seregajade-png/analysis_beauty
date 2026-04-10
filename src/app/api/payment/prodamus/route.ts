import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signProdamus } from "@/lib/prodamus";

/**
 * Webhook от Prodamus после оплаты.
 * Prodamus отправляет POST с form-urlencoded body + подпись в заголовке Sign.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const receivedSign = req.headers.get("Sign") ?? "";

    // Парсим form-data в nested dict (как делает Prodamus)
    const params = new URLSearchParams(body);
    const flat: Record<string, string> = {};
    for (const [key, value] of params.entries()) {
      flat[key] = value;
    }

    // Убираем signature из данных перед проверкой
    const { signature: _, ...dataWithoutSig } = flat;

    // Конвертируем flat PHP keys в nested dict
    const nested = phpToDict(dataWithoutSig);
    const expectedSign = signProdamus(nested);

    if (expectedSign.toLowerCase() !== receivedSign.toLowerCase()) {
      console.error("[PRODAMUS] Invalid signature. Expected:", expectedSign, "Got:", receivedSign);
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const orderId = flat.order_id ?? "";
    const paymentStatus = flat.payment_status ?? "";

    if (!orderId) {
      return NextResponse.json({ error: "No order_id" }, { status: 400 });
    }

    const paymentRequest = await prisma.paymentRequest.findUnique({
      where: { id: orderId },
    });

    if (!paymentRequest) {
      console.error(`[PRODAMUS] Payment request ${orderId} not found`);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (paymentStatus !== "success") {
      console.log(`[PRODAMUS] Payment ${orderId} status: ${paymentStatus}`);
      return NextResponse.json({ ok: true });
    }

    // Активируем подписку
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
        data: { subscriptionStatus: "ACTIVE", subscriptionEndsAt: newEndDate },
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

// Helper: convert flat PHP-style keys to nested object
function phpToDict(flat: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    const match = key.match(/^([^\[]+)((?:\[[^\]]+\])*)$/);
    if (!match || !match[2]) {
      result[key] = value;
      continue;
    }
    const parts = [match[1], ...match[2].match(/\[([^\]]+)\]/g)!.map(s => s.slice(1, -1))];
    let current: Record<string, unknown> = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current) || typeof current[parts[i]] !== "object") {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
  }
  return result;
}
