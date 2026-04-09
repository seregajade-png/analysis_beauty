import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { TRIAL_DAYS } from "@/lib/subscription";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const name = String(body.name ?? "").trim();
    const salonName = String(body.salonName ?? "").trim();
    const phone = String(body.phone ?? "").trim();

    // Валидация
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Некорректный email" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Пароль должен быть не менее 6 символов" }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "Укажите имя" }, { status: 400 });
    }
    if (!salonName) {
      return NextResponse.json({ error: "Укажите название салона" }, { status: 400 });
    }

    // Проверка что email свободен
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Пользователь с таким email уже существует" }, { status: 409 });
    }

    // Создаём пользователя с триалом 14 дней
    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        name,
        salonName,
        phone: phone || null,
        role: "OWNER",
        subscriptionStatus: "TRIAL",
        trialEndsAt,
      },
    });

    return NextResponse.json({
      success: true,
      userId: user.id,
      trialEndsAt,
    });
  } catch (error) {
    console.error("[REGISTER] Error:", error);
    return NextResponse.json(
      { error: "Ошибка регистрации" },
      { status: 500 }
    );
  }
}
