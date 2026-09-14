"use client";

import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useMemo } from "react";
import { KanbanColumn } from "@/components/kanban/KanbanColumn";
import { api } from "@/lib/client";
import { LEAD_STATUSES } from "@/lib/constants";
import { useToast } from "@/components/ui/ToastProvider";
import type { LeadStatus, LeadWithRelations, SessionUser } from "@/types/crm.types";

export function KanbanBoard({
  leads,
  onLeadsChange,
  user,
}: {
  leads: LeadWithRelations[];
  onLeadsChange: (leads: LeadWithRelations[]) => void;
  user: SessionUser;
}) {
  const { toast } = useToast();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const grouped = useMemo(() => {
    const map: Record<LeadStatus, LeadWithRelations[]> = {
      new: [],
      in_progress: [],
      waiting: [],
      won: [],
      lost: [],
    };
    for (const lead of leads) {
      map[lead.status].push(lead);
    }
    return map;
  }, [leads]);

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const leadId = String(active.id);
    const overId = String(over.id);
    const newStatus = (
      LEAD_STATUSES.some((s) => s.id === overId)
        ? overId
        : (over.data.current?.status as string | undefined)
    ) as LeadStatus | undefined;

    if (!newStatus || !LEAD_STATUSES.some((s) => s.id === newStatus)) return;

    const current = leads.find((l) => l.id === leadId);
    if (!current || current.status === newStatus) return;

    const previous = leads;
    onLeadsChange(
      leads.map((l) =>
        l.id === leadId
          ? { ...l, status: newStatus, updated_at: new Date().toISOString() }
          : l,
      ),
    );

    try {
      await api(`/api/leads/${leadId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      onLeadsChange(previous);
      toast(err instanceof Error ? err.message : "Не удалось сменить статус", "error");
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="flex min-h-[calc(100vh-11rem)] items-stretch gap-3 overflow-x-auto pb-2">
        {LEAD_STATUSES.map((col) => (
          <KanbanColumn
            key={col.id}
            status={col.id}
            label={col.label}
            leads={grouped[col.id]}
            user={user}
          />
        ))}
      </div>
    </DndContext>
  );
}
