"use client";

import { useDroppable } from "@dnd-kit/core";
import { LeadCard } from "@/components/kanban/LeadCard";
import { STATUS_COLORS } from "@/lib/constants";
import type { LeadStatus, LeadWithRelations, SessionUser } from "@/types/crm.types";

export function KanbanColumn({
  status,
  label,
  leads,
  user,
}: {
  status: LeadStatus;
  label: string;
  leads: LeadWithRelations[];
  user: SessionUser;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { type: "column", status },
  });
  const colors = STATUS_COLORS[status];

  return (
    <section className="flex w-[19.5rem] shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-[0_1px_0_rgb(28_22_18/0.04)]">
      <header className={`flex items-center justify-between gap-3 px-4 py-3 ${colors.header}`}>
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${colors.bar}`} />
          <h3 className="truncate text-[13px] font-semibold tracking-wide uppercase">
            {label}
          </h3>
        </div>
        <span
          className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${colors.count}`}
        >
          {leads.length}
        </span>
      </header>
      <div
        ref={setNodeRef}
        className={`flex min-h-[28rem] flex-1 flex-col gap-2.5 p-3 transition-colors ${
          isOver ? "bg-paper-2" : "bg-paper/40"
        }`}
      >
        {leads.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-line px-3 py-8 text-center text-xs text-muted">
            Перетащите заявку сюда
          </div>
        ) : (
          leads.map((lead) => <LeadCard key={lead.id} lead={lead} user={user} />)
        )}
      </div>
    </section>
  );
}
