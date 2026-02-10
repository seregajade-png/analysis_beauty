import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatScore, getScoreBg, formatDateTime } from "@/lib/utils";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  const userId = session.user.id;

  const [recentCalls, recentChats, recentTests, adminCard] = await Promise.all([
    prisma.callAnalysis.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.chatAnalysis.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.testResult.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.adminCard.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const avgCallScore =
    recentCalls.length > 0
      ? recentCalls.reduce((s, c) => s + (c.overallScore ?? 0), 0) /
        recentCalls.length
      : null;
  const avgChatScore =
    recentChats.length > 0
      ? recentChats.reduce((s, c) => s + (c.overallScore ?? 0), 0) /
        recentChats.length
      : null;

  const isAdmin = session.user.role === "ADMIN";

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Приветствие */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-brand-dark">
          Добрый день, {session.user.name?.split(" ")[0]}!
        </h1>
        <p className="text-muted-foreground mt-1">
          {isAdmin
            ? "Ваша персональная панель диагностики"
            : "Панель управления и аналитики"}
        </p>
      </div>

      {/* Сводные карточки */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Средняя оценка звонков"
          value={avgCallScore != null ? `${formatScore(avgCallScore)}/10` : "—"}
          sub={`${recentCalls.length} анализов`}
          color="orange"
          icon="☎"
        />
        <StatCard
          label="Средняя оценка переписок"
          value={avgChatScore != null ? `${formatScore(avgChatScore)}/10` : "—"}
          sub={`${recentChats.length} анализов`}
          color="green"
          icon="✉"
        />
        <StatCard
          label="Тестов пройдено"
          value={String(recentTests.length)}
          sub="за последнее время"
          color="orange"
          icon="◈"
        />
        <StatCard
          label="Общая оценка"
          value={
            adminCard?.overallScore != null
              ? `${formatScore(adminCard.overallScore)}/10`
              : "—"
          }
          sub="карточка администратора"
          color="green"
          icon="◉"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Последние звонки */}
        <div className="card-brand p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-brand-dark flex items-center gap-2">
              <span className="text-brand-orange">☎</span> Последние звонки
            </h2>
            <Link
              href="/analysis/calls"
              className="text-xs text-brand-orange hover:underline font-medium"
            >
              Все →
            </Link>
          </div>
          {recentCalls.length === 0 ? (
            <EmptyState
              label="Нет анализов"
              action={{ href: "/analysis/calls", label: "Загрузить звонок" }}
            />
          ) : (
            <ul className="space-y-2">
              {recentCalls.map((call) => (
                <li key={call.id}>
                  <Link
                    href={`/analysis/calls?id=${call.id}`}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-muted transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground group-hover:text-brand-orange transition-colors">
                        {call.title ?? call.audioFileName ?? "Звонок"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(call.createdAt)}
                      </p>
                    </div>
                    {call.overallScore != null && (
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded-lg border ${getScoreBg(call.overallScore)}`}
                      >
                        {formatScore(call.overallScore)}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Последние переписки */}
        <div className="card-brand p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-brand-dark flex items-center gap-2">
              <span className="text-brand-green">✉</span> Последние переписки
            </h2>
            <Link
              href="/analysis/chats"
              className="text-xs text-brand-orange hover:underline font-medium"
            >
              Все →
            </Link>
          </div>
          {recentChats.length === 0 ? (
            <EmptyState
              label="Нет анализов"
              action={{ href: "/analysis/chats", label: "Добавить переписку" }}
            />
          ) : (
            <ul className="space-y-2">
              {recentChats.map((chat) => (
                <li key={chat.id}>
                  <Link
                    href={`/analysis/chats?id=${chat.id}`}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-muted transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground group-hover:text-brand-green transition-colors">
                        {chat.title ?? "Переписка"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {chat.source} · {formatDateTime(chat.createdAt)}
                      </p>
                    </div>
                    {chat.overallScore != null && (
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded-lg border ${getScoreBg(chat.overallScore)}`}
                      >
                        {formatScore(chat.overallScore)}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Быстрые действия */}
      <div className="mt-6">
        <h2 className="font-semibold text-brand-dark mb-4">Начать тест</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              href: "/testing/cases",
              label: "Практический кейс",
              icon: "◈",
              color: "bg-brand-orange-bg border-brand-orange/20",
            },
            {
              href: "/testing/roleplay",
              label: "Ролевая игра",
              icon: "▷",
              color: "bg-brand-green-bg border-brand-green/20",
            },
            {
              href: "/testing/products",
              label: "Знание продуктов",
              icon: "◎",
              color: "bg-brand-orange-bg border-brand-orange/20",
            },
            {
              href: "/testing/crm",
              label: "Работа с CRM",
              icon: "⊕",
              color: "bg-brand-green-bg border-brand-green/20",
            },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border ${action.color} hover:shadow-sm transition-all text-center`}
            >
              <span className="text-2xl">{action.icon}</span>
              <span className="text-sm font-medium text-brand-dark">
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  color: "orange" | "green";
  icon: string;
}) {
  return (
    <div className="card-brand p-4">
      <div className="flex items-start justify-between mb-3">
        <span
          className={`w-9 h-9 rounded-xl flex items-center justify-center text-base ${
            color === "orange"
              ? "bg-brand-orange-bg text-brand-orange"
              : "bg-brand-green-bg text-brand-green"
          }`}
        >
          {icon}
        </span>
      </div>
      <p className="text-2xl font-bold text-brand-dark">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      <p className="text-xs text-foreground font-medium mt-1">{label}</p>
    </div>
  );
}

function EmptyState({
  label,
  action,
}: {
  label: string;
  action: { href: string; label: string };
}) {
  return (
    <div className="text-center py-8">
      <p className="text-sm text-muted-foreground mb-3">{label}</p>
      <Link
        href={action.href}
        className="inline-flex items-center gap-1 text-xs font-medium text-brand-orange hover:underline"
      >
        {action.label} →
      </Link>
    </div>
  );
}
