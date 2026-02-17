import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

// GET - проверка состояния
export async function GET() {
  const checks: Record<string, unknown> = {};

  checks.env = {
    DATABASE_URL: process.env.DATABASE_URL ? "set" : "NOT SET",
    AUTH_SECRET: process.env.AUTH_SECRET ? "set" : "NOT SET",
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "set" : "NOT SET",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "NOT SET",
  };

  try {
    const user = await prisma.user.findUnique({
      where: { email: "owner@beauty-school.ru" },
      select: { password: true },
    });
    const expectedHash = hashPassword("password123");
    checks.passwordCheck = {
      match: user?.password === expectedHash,
    };
  } catch (e) {
    checks.passwordCheck = { error: String(e) };
  }

  return NextResponse.json(checks);
}

// POST - имитация логина
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) return NextResponse.json({ step: "findUser", result: "not found", email });
    if (!user.password) return NextResponse.json({ step: "checkPassword", result: "no password set" });

    const hashed = hashPassword(password);
    const match = hashed === user.password;

    return NextResponse.json({
      step: "complete",
      userFound: true,
      passwordMatch: match,
      hashedInput: hashed.substring(0, 16) + "...",
      storedHash: user.password.substring(0, 16) + "...",
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
