"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { SessionContext } from "@/components/layout/SessionContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { SessionUser } from "@/types/crm.types";

export function AppShell({
  children,
  user: initialUser,
  overdueTasks: initialOverdue,
}: {
  children: React.ReactNode;
  user: SessionUser;
  overdueTasks: number;
}) {
  const pathname = usePathname();
  const [user, setUser] = useState(initialUser);
  const [overdueTasks, setOverdueTasks] = useState(initialOverdue);

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  return (
    <SessionContext.Provider value={{ user, setUser, overdueTasks, setOverdueTasks }}>
      <ToastProvider>
        <div className="flex min-h-screen">
          <div className="sticky top-0 hidden h-screen md:block">
            <Sidebar user={user} overdueTasks={overdueTasks} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar pathname={pathname} user={user} />
            <MobileNav />
            <main className="flex-1 p-4 sm:p-6">{children}</main>
          </div>
        </div>
      </ToastProvider>
    </SessionContext.Provider>
  );
}

function MobileNav() {
  return (
    <div className="border-b border-line md:hidden">
      <div className="flex gap-1 overflow-x-auto px-3 py-2 text-sm">
        {[
          ["/dashboard", "Дашборд"],
          ["/leads", "Заявки"],
          ["/clients", "Клиенты"],
          ["/tasks", "Задачи"],
          ["/profile", "Профиль"],
        ].map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className="shrink-0 rounded-full bg-paper-2 px-3 py-1"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
