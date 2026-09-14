import type { LeadSource, LeadStatus } from "@/types/crm.types";

export const LEAD_STATUSES: { id: LeadStatus; label: string }[] = [
  { id: "new", label: "Новая" },
  { id: "in_progress", label: "В работе" },
  { id: "waiting", label: "Ожидание" },
  { id: "won", label: "Успешно" },
  { id: "lost", label: "Отказ" },
];

export const LEAD_SOURCES: { id: LeadSource; label: string }[] = [
  { id: "manual", label: "Вручную" },
  { id: "phone", label: "Телефон" },
  { id: "referral", label: "Рекомендация" },
  { id: "website_form", label: "Форма сайта" },
  { id: "telegram_bot", label: "Telegram" },
  { id: "other", label: "Другое" },
];

export const STATUS_COLORS: Record<
  LeadStatus,
  { bar: string; chip: string; header: string; count: string; accent: string }
> = {
  new: {
    bar: "bg-sky-500",
    chip: "bg-sky-100 text-sky-800",
    header: "bg-sky-50",
    count: "bg-sky-100 text-sky-800",
    accent: "border-l-sky-400",
  },
  in_progress: {
    bar: "bg-amber-500",
    chip: "bg-amber-100 text-amber-900",
    header: "bg-amber-50",
    count: "bg-amber-100 text-amber-900",
    accent: "border-l-amber-400",
  },
  waiting: {
    bar: "bg-violet-500",
    chip: "bg-violet-100 text-violet-800",
    header: "bg-violet-50",
    count: "bg-violet-100 text-violet-800",
    accent: "border-l-violet-400",
  },
  won: {
    bar: "bg-emerald-600",
    chip: "bg-emerald-100 text-emerald-800",
    header: "bg-emerald-50",
    count: "bg-emerald-100 text-emerald-800",
    accent: "border-l-emerald-500",
  },
  lost: {
    bar: "bg-rose-500",
    chip: "bg-rose-100 text-rose-800",
    header: "bg-rose-50",
    count: "bg-rose-100 text-rose-800",
    accent: "border-l-rose-400",
  },
};

export const SESSION_COOKIE = "session";
export const SESSION_DAYS = 7;

export function statusLabel(status: LeadStatus): string {
  return LEAD_STATUSES.find((s) => s.id === status)?.label ?? status;
}

export function sourceLabel(source: LeadSource): string {
  return LEAD_SOURCES.find((s) => s.id === source)?.label ?? source;
}
