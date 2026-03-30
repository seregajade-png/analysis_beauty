"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect } from "react";
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
  Menu,
  X,
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
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const isOwnerOrManager =
    session?.user?.role === "OWNER" || session?.user?.role === "MANAGER";

  const roleLabel =
    session?.user?.role === "OWNER"
      ? "Владелец"
      : session?.user?.role === "MANAGER"
      ? "Менеджер"
      : "Администратор";

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isMobile && open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isMobile, open]);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-8 pb-6 flex items-center justify-between">
        <div>
          <h2 className="heading-display text-2xl text-foreground tracking-wide">
            Beauty
            <span className="text-primary"> AI</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1 font-body">
            {session?.user?.salonName ?? "Аналитика салона"}
          </p>
        </div>
        {isMobile && (
          <button onClick={() => setOpen(false)} className="p-2 -mr-2 text-muted-foreground hover:text-foreground">
            <X size={24} />
          </button>
        )}
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
    </>
  );

  // Mobile: hamburger button + overlay drawer
  if (isMobile) {
    return (
      <>
        {/* Top bar with hamburger */}
        <header className="fixed top-0 left-0 right-0 h-14 bg-background/80 backdrop-blur-md border-b border-border flex items-center px-4 z-50">
          <button onClick={() => setOpen(true)} className="p-2 -ml-2 text-foreground">
            <Menu size={24} />
          </button>
          <h2 className="heading-display text-lg text-foreground tracking-wide ml-3">
            Beauty<span className="text-primary"> AI</span>
          </h2>
        </header>

        {/* Overlay */}
        {open && (
          <div
            className="fixed inset-0 bg-black/50 z-[60] animate-in fade-in duration-200"
            onClick={() => setOpen(false)}
          />
        )}

        {/* Drawer */}
        <aside
          className={cn(
            "fixed left-0 top-0 h-screen w-72 card-salon border-r border-border flex flex-col z-[70] transition-transform duration-300 ease-in-out",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {sidebarContent}
        </aside>
      </>
    );
  }

  // Desktop: fixed sidebar
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 card-salon border-r border-border flex flex-col z-50">
      {sidebarContent}
    </aside>
  );
}
