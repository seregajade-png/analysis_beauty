"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Phone,
  MessageSquare,
  FlaskConical,
  Gamepad2,
  Package,
  Database,
  UserCircle,
  Settings,
  LogOut,
} from "lucide-react";

const navItems = [
  {
    group: "Анализ",
    items: [
      { href: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
      { href: "/analysis/calls", label: "Анализ звонков", icon: Phone },
      { href: "/analysis/chats", label: "Анализ переписок", icon: MessageSquare },
    ],
  },
  {
    group: "Тестирование",
    items: [
      { href: "/testing/cases", label: "Практические кейсы", icon: FlaskConical },
      { href: "/testing/roleplay", label: "Ролевые игры", icon: Gamepad2 },
      { href: "/testing/products", label: "Знание продуктов (ХПВ)", icon: Package },
      { href: "/testing/crm", label: "Работа с CRM", icon: Database },
    ],
  },
  {
    group: "Результаты",
    items: [
      { href: "/admin-card", label: "Карточка администратора", icon: UserCircle },
    ],
  },
];

const ownerManagerItems = [
  { href: "/settings", label: "Настройки", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isOwnerOrManager =
    session?.user?.role === "OWNER" || session?.user?.role === "MANAGER";

  const roleLabel =
    session?.user?.role === "OWNER"
      ? "Владелец"
      : session?.user?.role === "MANAGER"
      ? "Менеджер"
      : "Администратор";

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 card-salon border-r border-border flex flex-col z-50">
      {/* Logo */}
      <div className="p-8 pb-6">
        <h2 className="heading-display text-2xl text-foreground tracking-wide">
          Beauty
          <span className="text-primary"> AI</span>
        </h2>
        <p className="text-sm text-muted-foreground mt-1 font-body">
          {session?.user?.salonName ?? "Аналитика салона"}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-5 overflow-y-auto">
        {navItems.map((group) => (
          <div key={group.group}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.15em]">
              {group.group}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      <Icon size={18} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {isOwnerOrManager && (
          <div>
            <p className="px-3 mb-1.5 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.15em]">
              Управление
            </p>
            <ul className="space-y-0.5">
              {ownerManagerItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      <Icon size={18} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 space-y-2">
        <div className="p-3 rounded-lg bg-muted">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Роль</p>
          <p className="text-sm font-medium text-foreground">{roleLabel}</p>
          {session?.user?.name && (
            <p className="text-xs text-muted-foreground mt-0.5">{session.user.name}</p>
          )}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all"
        >
          <LogOut size={18} />
          Выйти
        </button>
      </div>
    </aside>
  );
}
