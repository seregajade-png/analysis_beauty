import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
import { encode } from "next-auth/jwt";

const SECRET = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";

export async function POST(req: NextRequest) {
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

    const hash = createHash("sha256").update(String(password)).digest("hex");
    if (hash !== user.password) {
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
