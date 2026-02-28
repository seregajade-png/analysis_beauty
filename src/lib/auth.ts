import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare, hash } from "bcryptjs";
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

const SHA256_HEX_RE = /^[a-f0-9]{64}$/;

/** Проверяет пароль: сначала bcrypt, затем legacy SHA256 с авто-миграцией */
async function verifyPassword(
  password: string,
  storedHash: string,
  userId: string
): Promise<boolean> {
  // Новый формат — bcrypt ($2a$, $2b$)
  if (storedHash.startsWith("$2")) {
    return compare(password, storedHash);
  }

  // Legacy формат — SHA256 (64 hex символа)
  if (SHA256_HEX_RE.test(storedHash)) {
    const sha256Hash = createHash("sha256").update(password).digest("hex");
    if (sha256Hash !== storedHash) return false;

    // Авто-миграция: перехешируем в bcrypt
    try {
      const bcryptHash = await hash(password, 12);
      await prisma.user.update({
        where: { id: userId },
        data: { password: bcryptHash },
      });
      console.log(`[AUTH] Migrated password to bcrypt for user ${userId}`);
    } catch (err) {
      console.error("[AUTH] Failed to migrate password:", err);
    }
    return true;
  }

  return false;
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
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

        const isValid = await verifyPassword(password, user.password, user.id);
        if (!isValid) return null;

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
