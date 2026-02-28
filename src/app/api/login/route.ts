import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compare, hash } from "bcryptjs";
import { createHash } from "crypto";
import { encode } from "next-auth/jwt";

const SECRET = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
const SHA256_HEX_RE = /^[a-f0-9]{64}$/;

/** Проверяет пароль: bcrypt или legacy SHA256 с авто-миграцией */
async function verifyPassword(
  password: string,
  storedHash: string,
  userId: string
): Promise<boolean> {
  if (storedHash.startsWith("$2")) {
    return compare(password, storedHash);
  }
  if (SHA256_HEX_RE.test(storedHash)) {
    const sha256Hash = createHash("sha256").update(password).digest("hex");
    if (sha256Hash !== storedHash) return false;
    try {
      const bcryptHash = await hash(password, 12);
      await prisma.user.update({
        where: { id: userId },
        data: { password: bcryptHash },
      });
      console.log(`[LOGIN] Migrated password to bcrypt for user ${userId}`);
    } catch (err) {
      console.error("[LOGIN] Failed to migrate password:", err);
    }
    return true;
  }
  return false;
}

export async function POST(req: NextRequest) {
  if (!SECRET) {
    console.error("[LOGIN] AUTH_SECRET / NEXTAUTH_SECRET не задан");
    return NextResponse.json({ error: "Ошибка конфигурации сервера" }, { status: 500 });
  }

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email и пароль обязательны" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).trim() },
    });

    if (!user || !user.password) {
      return NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 });
    }

    const isValid = await verifyPassword(String(password), user.password, user.id);
    if (!isValid) {
      return NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 });
    }

    // Создаём JWT в том же формате, что и NextAuth (JWE)
    const isSecure = req.url.startsWith("https");
    const cookieName = isSecure
      ? "__Secure-authjs.session-token"
      : "authjs.session-token";

    const token = await encode({
      token: {
        sub: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        salonName: user.salonName,
      },
      secret: SECRET,
      salt: cookieName,
      maxAge: 30 * 24 * 60 * 60, // 30 дней
    });

    const response = NextResponse.json({ ok: true });

    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (err) {
    console.error("[LOGIN] Error:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
