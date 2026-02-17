import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const checks: Record<string, unknown> = {};

  // 1. Проверяем env-переменные (без секретов)
  checks.env = {
    DATABASE_URL: process.env.DATABASE_URL ? "set (" + process.env.DATABASE_URL.substring(0, 30) + "...)" : "NOT SET",
    AUTH_SECRET: process.env.AUTH_SECRET ? "set" : "NOT SET",
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "set" : "NOT SET",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "NOT SET",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "set" : "NOT SET",
  };

  // 2. Проверяем DB
  try {
    const count = await prisma.user.count();
    checks.db = { status: "connected", userCount: count };
  } catch (e) {
    checks.db = { status: "error", message: String(e) };
  }

  // 3. Проверяем конкретного пользователя
  try {
    const user = await prisma.user.findUnique({
      where: { email: "owner@beauty-school.ru" },
      select: { id: true, email: true, name: true, role: true, password: true },
    });
    checks.testUser = user
      ? { found: true, name: user.name, role: user.role, hasPassword: !!user.password, passwordLength: user.password?.length }
      : { found: false };
  } catch (e) {
    checks.testUser = { error: String(e) };
  }

  return NextResponse.json(checks);
}
