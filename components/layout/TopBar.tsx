"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import type { SessionUser } from "@/types/crm.types";

const TITLES: Record<string, string> = {
  "/dashboard": "Дашборд",
  "/leads": "Заявки",
  "/clients": "Клиенты",
  "/tasks": "Задачи",
  "/users": "Сотрудники",
  "/profile": "Профиль",
};

export function TopBar({
  pathname,
  user,
}: {
  pathname: string;
  user: SessionUser;
}) {
  const base = "/" + (pathname.split("/")[1] ?? "");
  const title = TITLES[base] ?? "CRM";
  const today = new Date().toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <header className="flex h-16 items-center justify-between border-b border-line px-6">
      <div>
        <h1 className="font-display text-lg">{title}</h1>
        <p className="text-xs text-muted capitalize">{today}</p>
      </div>
      <Link href="/profile" className="hidden items-center gap-3 sm:flex">
        <div className="text-right">
          <div className="text-sm font-medium">{user.name}</div>
          <div className="text-xs text-muted">{user.email}</div>
        </div>
        <Avatar name={user.name} src={user.avatar_url} size={36} />
      </Link>
    </header>
  );
}
