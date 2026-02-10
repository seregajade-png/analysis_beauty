"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    group: "Анализ",
    items: [
      { href: "/dashboard", label: "Дашборд", icon: "⊞" },
      { href: "/analysis/calls", label: "Анализ звонков", icon: "☎" },
      { href: "/analysis/chats", label: "Анализ переписок", icon: "✉" },
    ],
  },
  {
    group: "Тестирование",
    items: [
      { href: "/testing/cases", label: "Практические кейсы", icon: "◈" },
      { href: "/testing/roleplay", label: "Ролевые игры", icon: "▷" },
      { href: "/testing/products", label: "Знание продуктов (ХПВ)", icon: "◎" },
      { href: "/testing/crm", label: "Работа с CRM", icon: "⊕" },
    ],
  },
  {
    group: "Результаты",
    items: [
      { href: "/admin-card", label: "Карточка администратора", icon: "◉" },
    ],
  },
];

const ownerManagerItems = [
  { href: "/settings", label: "Настройки", icon: "⚙" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isOwnerOrManager =
    session?.user?.role === "OWNER" || session?.user?.role === "MANAGER";

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-border flex flex-col">
      {/* Логотип */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-orange to-brand-orange-light flex items-center justify-center text-white text-lg shadow-sm">
            ✦
          </div>
          <div>
            <div className="font-bold text-sm text-brand-dark leading-tight">
              {session?.user?.salonName ?? "Beauty Analyzer"}
            </div>
            <div className="text-xs text-muted-foreground">
              {session?.user?.name}
            </div>
          </div>
        </div>
      </div>

      {/* Навигация */}
      <nav className="flex-1 p-3 space-y-5 overflow-y-auto">
        {navItems.map((group) => (
          <div key={group.group}>
            <p className="px-3 mb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {group.group}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "nav-item",
                        isActive && "nav-item-active"
                      )}
                    >
                      <span className="text-base w-5 text-center">
                        {item.icon}
                      </span>
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
            <p className="px-3 mb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Управление
            </p>
            <ul className="space-y-0.5">
              {ownerManagerItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "nav-item",
                        isActive && "nav-item-active"
                      )}
                    >
                      <span className="text-base w-5 text-center">
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>

      {/* Роль и выход */}
      <div className="p-3 border-t border-border">
        <div className="px-3 py-2 rounded-xl bg-muted mb-2">
          <p className="text-xs text-muted-foreground">Роль</p>
          <p className="text-sm font-medium text-foreground">
            {session?.user?.role === "OWNER"
              ? "Владелец"
              : session?.user?.role === "MANAGER"
              ? "Менеджер"
              : "Администратор"}
          </p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full nav-item text-muted-foreground hover:text-red-600 hover:bg-red-50 justify-start"
        >
          <span className="text-base w-5 text-center">→</span>
          Выйти
        </button>
      </div>
    </aside>
  );
}
