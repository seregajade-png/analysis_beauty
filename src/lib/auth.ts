import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      salonName?: string | null;
    } & DefaultSession["user"];
  }
  interface User {
    role: UserRole;
    salonName?: string | null;
  }
}

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  // Не используем PrismaAdapter — работаем через JWT только
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Пароль", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        let user;
        try {
          user = await prisma.user.findUnique({
            where: { email },
          });
        } catch (err) {
          console.error("[AUTH] DB error:", err);
          return null;
        }

        if (!user || !user.password) return null;

        const hashedInput = hashPassword(password);
        if (hashedInput !== user.password) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          salonName: user.salonName,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.salonName = user.salonName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as UserRole;
        session.user.salonName = token.salonName as string | null;
      }
      return session;
    },
  },
});
