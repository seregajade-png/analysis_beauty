import { prisma } from "@/lib/prisma";
import type { SubscriptionStatus } from "@prisma/client";

export const TRIAL_DAYS = 14;
export const TRIAL_DAILY_LIMIT_CALLS = 5;
export const TRIAL_DAILY_LIMIT_CHATS = 5;
export const ACTIVE_DAILY_LIMIT_CALLS = 20;
export const ACTIVE_DAILY_LIMIT_CHATS = 20;
export const SUBSCRIPTION_PRICE_RUB = 2490;

export interface AccessInfo {
  hasAccess: boolean;
  status: SubscriptionStatus;
  reason?: string;
  callsRemaining: number;
  chatsRemaining: number;
  callsLimit: number;
  chatsLimit: number;
  trialEndsAt?: Date | null;
  subscriptionEndsAt?: Date | null;
}

function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function getAccessInfo(userId: string): Promise<AccessInfo> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionStatus: true,
      trialEndsAt: true,
      subscriptionEndsAt: true,
    },
  });

  if (!user) {
    return {
      hasAccess: false,
      status: "EXPIRED",
      reason: "Пользователь не найден",
      callsRemaining: 0,
      chatsRemaining: 0,
      callsLimit: 0,
      chatsLimit: 0,
    };
  }

  const now = new Date();
  let status = user.subscriptionStatus;

  // Авто-определение актуального статуса
  if (status === "ACTIVE" && user.subscriptionEndsAt && user.subscriptionEndsAt < now) {
    status = "EXPIRED";
  } else if (status === "TRIAL" && user.trialEndsAt && user.trialEndsAt < now) {
    status = "EXPIRED";
  }

  // Обновляем в БД, если статус изменился
  if (status !== user.subscriptionStatus) {
    await prisma.user.update({
      where: { id: userId },
      data: { subscriptionStatus: status },
    });
  }

  const callsLimit =
    status === "ACTIVE" ? ACTIVE_DAILY_LIMIT_CALLS :
    status === "TRIAL" ? TRIAL_DAILY_LIMIT_CALLS : 0;
  const chatsLimit =
    status === "ACTIVE" ? ACTIVE_DAILY_LIMIT_CHATS :
    status === "TRIAL" ? TRIAL_DAILY_LIMIT_CHATS : 0;

  // Считаем использование за сегодня
  const today = todayUtc();
  const usage = await prisma.dailyUsage.findUnique({
    where: { userId_date: { userId, date: today } },
  });

  const callsUsed = usage?.callsCount ?? 0;
  const chatsUsed = usage?.chatsCount ?? 0;

  return {
    hasAccess: status !== "EXPIRED",
    status,
    reason: status === "EXPIRED" ? "Подписка истекла" : undefined,
    callsRemaining: Math.max(0, callsLimit - callsUsed),
    chatsRemaining: Math.max(0, chatsLimit - chatsUsed),
    callsLimit,
    chatsLimit,
    trialEndsAt: user.trialEndsAt,
    subscriptionEndsAt: user.subscriptionEndsAt,
  };
}

export async function checkAndIncrementUsage(
  userId: string,
  type: "calls" | "chats"
): Promise<{ allowed: boolean; reason?: string }> {
  const access = await getAccessInfo(userId);

  if (!access.hasAccess) {
    return { allowed: false, reason: access.reason ?? "Нет доступа" };
  }

  const remaining = type === "calls" ? access.callsRemaining : access.chatsRemaining;
  const limit = type === "calls" ? access.callsLimit : access.chatsLimit;

  if (remaining <= 0) {
    return {
      allowed: false,
      reason: `Достигнут дневной лимит (${limit} ${type === "calls" ? "звонков" : "переписок"} в день). Лимит обновится завтра.`,
    };
  }

  // Инкрементируем использование (upsert)
  const today = todayUtc();
  await prisma.dailyUsage.upsert({
    where: { userId_date: { userId, date: today } },
    create: {
      userId,
      date: today,
      callsCount: type === "calls" ? 1 : 0,
      chatsCount: type === "chats" ? 1 : 0,
    },
    update: {
      callsCount: type === "calls" ? { increment: 1 } : undefined,
      chatsCount: type === "chats" ? { increment: 1 } : undefined,
    },
  });

  return { allowed: true };
}
