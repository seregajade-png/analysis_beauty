import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatScore, getScoreBg, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import {
  Phone,
  MessageSquare,
  FlaskConical,
  TrendingUp,
  UserCircle,
  Gamepad2,
  Package,
  Database,
} from "lucide-react";

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
    <div className="max-w-6xl mx-auto">
      {/* Hero Banner — Glass over gradient */}
      <div className="relative rounded-2xl mb-8 overflow-hidden">
        {/* Зелёный градиент — фон за стеклом */}
        <div className="absolute inset-0" style={{background: "var(--gradient-emerald)"}} />
        {/* Стекло поверх — без краёв */}
        <div className="relative p-10 pb-16" style={{
          background: "hsla(0, 0%, 100%, 0.12)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}>
          <div className="max-w-2xl">
            <h1 className="heading-display text-3xl lg:text-4xl text-white">
              Дашборд
            </h1>
            <p className="mt-2 text-base text-white/70">
              {isAdmin
                ? `Добрый день, ${session.user.name?.split(" ")[0]}! Ваша панель диагностики`
                : `Добрый день, ${session.user.name?.split(" ")[0]}! Панель управления и аналитики`}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Средняя оценка звонков"
          value={avgCallScore != null ? `${formatScore(avgCallScore)}/10` : "—"}
          subtitle={`${recentCalls.length} анализов`}
          icon={<Phone size={18} />}
        />
        <StatCard
          title="Средняя оценка переписок"
          value={avgChatScore != null ? `${formatScore(avgChatScore)}/10` : "—"}
          subtitle={`${recentChats.length} анализов`}
          icon={<MessageSquare size={18} />}
          accent
        />
        <StatCard
          title="Тестов пройдено"
          value={String(recentTests.length)}
          subtitle="за последнее время"
          icon={<FlaskConical size={18} />}
        />
        <StatCard
          title="Общая оценка"
          value={
            adminCard?.overallScore != null
              ? `${formatScore(adminCard.overallScore)}/10`
              : "—"
          }
          subtitle="карточка администратора"
          icon={<TrendingUp size={18} />}
          accent
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent calls — Emerald gradient card */}
        <div className="rounded-[1.25rem] overflow-hidden shadow-glass-panel p-6" style={{background: "var(--gradient-emerald)"}}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-xl text-white flex items-center gap-2">
                <Phone size={18} className="text-white/80" /> Последние звонки
              </h3>
              <Link
                href="/analysis/calls"
                className="text-xs text-white/70 hover:text-white font-medium transition-colors"
              >
                Все →
              </Link>
            </div>
            {recentCalls.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-white/60 mb-3">Нет анализов</p>
                <Link
                  href="/analysis/calls"
                  className="btn-primary-salon inline-flex items-center gap-1 text-xs"
                >
                  Загрузить звонок →
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                {recentCalls.map((call) => (
                  <Link
                    key={call.id}
                    href={`/analysis/calls?id=${call.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-white/15 transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-medium text-white group-hover:text-white/90 transition-colors">
                        {call.title ?? call.audioFileName ?? "Звонок"}
                      </p>
                      <p className="text-xs text-white/50">
                        {formatDateTime(call.createdAt)}
                      </p>
                    </div>
                    {call.overallScore != null && (
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg ${getScoreBg(call.overallScore)}`}
                      >
                        {formatScore(call.overallScore)}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
        </div>

        {/* Recent chats */}
        <div className="card-salon p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-bold text-xl text-foreground flex items-center gap-2">
              <MessageSquare size={18} className="text-secondary" /> Последние переписки
            </h3>
            <Link
              href="/analysis/chats"
              className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
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
            <div className="space-y-1">
              {recentChats.map((chat) => (
                <Link
                  key={chat.id}
                  href={`/analysis/chats?id=${chat.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors group"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
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
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-8">
        <h3 className="font-heading font-bold text-xl text-foreground mb-4">Начать тест</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { href: "/testing/cases", label: "Практический кейс", icon: FlaskConical },
            { href: "/testing/roleplay", label: "Ролевая игра", icon: Gamepad2 },
            { href: "/testing/products", label: "Знание продуктов", icon: Package },
            { href: "/testing/crm", label: "Работа с CRM", icon: Database },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="card-salon flex flex-col items-center gap-3 p-6 hover:border-primary transition-all duration-200 text-center group"
            >
              <div className="w-12 h-12 rounded-full bg-mint flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-200">
                <action.icon size={22} />
              </div>
              <span className="text-sm font-medium text-foreground">
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
  title,
  value,
  subtitle,
  icon,
  accent,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={`card-salon p-6 animate-fade-in ${accent ? "border-primary" : ""}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-3xl font-heading font-bold mt-2 text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-mint flex items-center justify-center text-primary">
          {icon}
        </div>
      </div>
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
        className="btn-primary-salon inline-flex items-center gap-1 text-xs"
      >
        {action.label} →
      </Link>
    </div>
  );
}
