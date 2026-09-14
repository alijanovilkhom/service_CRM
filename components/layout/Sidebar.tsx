"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  ClipboardList,
  Kanban,
  LogOut,
  UserRound,
  Users,
  UserSquare2,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types/crm.types";

const NAV = [
  { href: "/dashboard", label: "Дашборд", icon: BarChart3 },
  { href: "/leads", label: "Заявки", icon: Kanban },
  { href: "/clients", label: "Клиенты", icon: Users },
  { href: "/tasks", label: "Задачи", icon: ClipboardList },
  { href: "/profile", label: "Профиль", icon: UserRound },
  { href: "/users", label: "Сотрудники", icon: UserSquare2, adminOnly: true },
];

export function Sidebar({
  user,
  overdueTasks,
}: {
  user: SessionUser;
  overdueTasks: number;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-ink text-[#f6efe6]">
      <div className="px-5 pt-6 pb-5">
        <div className="font-display text-2xl tracking-tight">Atrium</div>
        <p className="mt-1 text-xs text-[#cbbba8]">CRM для заявок и клиентов</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV.filter((item) => !item.adminOnly || user.role === "admin").map(
          (item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                  active
                    ? "bg-copper text-white"
                    : "text-[#d9cbbd] hover:bg-ink-soft hover:text-white",
                )}
              >
                <Icon size={18} />
                <span className="flex-1">{item.label}</span>
                {item.href === "/tasks" && overdueTasks > 0 && (
                  <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {overdueTasks}
                  </span>
                )}
              </Link>
            );
          },
        )}
      </nav>

      <div className="mt-auto border-t border-white/10 p-4">
        <Link href="/profile" className="flex items-center gap-3 rounded-xl p-1 hover:bg-ink-soft">
          <Avatar name={user.name} src={user.avatar_url} size={40} />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{user.name}</div>
            <div className="text-xs text-[#cbbba8]">
              {user.role === "admin" ? "Администратор" : "Менеджер"}
            </div>
          </div>
        </Link>
        <button
          type="button"
          onClick={logout}
          className="mt-3 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm text-[#d9cbbd] hover:bg-ink-soft hover:text-white"
        >
          <LogOut size={16} />
          Выйти
        </button>
      </div>
    </aside>
  );
}
