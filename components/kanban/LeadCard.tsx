"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { sourceLabel, STATUS_COLORS } from "@/lib/constants";
import { formatMoney } from "@/lib/utils";
import type { LeadWithRelations, SessionUser } from "@/types/crm.types";

export function LeadCard({
  lead,
  user,
}: {
  lead: LeadWithRelations;
  user: SessionUser;
}) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { status: lead.status },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => {
        if (!isDragging) router.push(`/leads/${lead.id}`);
      }}
      className={`cursor-grab rounded-xl border border-line border-l-[3px] bg-card p-3.5 text-left shadow-[0_1px_0_rgb(28_22_18/0.03)] transition hover:border-copper/30 active:cursor-grabbing ${STATUS_COLORS[lead.status].accent}`}
    >
      <div className="font-medium leading-snug text-ink">{lead.client_name}</div>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="chip bg-paper-2 text-muted">{sourceLabel(lead.source)}</span>
        {lead.value != null && (
          <span className="text-sm font-medium text-ink">{formatMoney(lead.value)}</span>
        )}
      </div>
      {user.role === "admin" && (
        <div className="mt-2 truncate text-xs text-muted">
          {lead.assignee_name ?? "Не назначена"}
        </div>
      )}
    </button>
  );
}
