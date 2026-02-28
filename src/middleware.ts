import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decode } from "next-auth/jwt";

const publicRoutes = ["/login", "/register", "/api/auth", "/api/login"];

const COOKIE_NAMES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Публичные маршруты
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.error("[MIDDLEWARE] AUTH_SECRET / NEXTAUTH_SECRET не задан");
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Пробуем все возможные имена cookie
  for (const cookieName of COOKIE_NAMES) {
    const cookieValue = req.cookies.get(cookieName)?.value;
    if (!cookieValue) continue;

    try {
      const token = await decode({
        token: cookieValue,
        secret,
        salt: cookieName,
      });
      if (token?.sub) {
        return NextResponse.next();
      }
    } catch {
      // Пробуем следующее имя
    }
  }

  // Нет валидного токена
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
