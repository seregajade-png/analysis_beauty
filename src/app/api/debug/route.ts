import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, unknown> = {};

  checks.env = {
    DATABASE_URL: process.env.DATABASE_URL ? "set (" + process.env.DATABASE_URL.substring(0, 30) + "...)" : "NOT SET",
    AUTH_SECRET: process.env.AUTH_SECRET ? "set" : "NOT SET",
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "set" : "NOT SET",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "NOT SET",
  };

  try {
    const user = await prisma.user.findUnique({
      where: { email: "owner@beauty-school.ru" },
      select: { password: true },
    });

    const expectedHash = createHash("sha256").update("password123").digest("hex");

    checks.passwordCheck = {
      storedHash: user?.password?.substring(0, 16) + "...",
      expectedHash: expectedHash.substring(0, 16) + "...",
      match: user?.password === expectedHash,
    };
  } catch (e) {
    checks.passwordCheck = { error: String(e) };
  }

  return NextResponse.json(checks);
}
