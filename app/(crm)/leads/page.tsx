"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { LeadForm } from "@/components/forms/LeadForm";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { useSession } from "@/components/layout/SessionContext";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/client";
import type { LeadWithRelations } from "@/types/crm.types";

export default function LeadsPage() {
  const { user } = useSession();
  const [leads, setLeads] = useState<LeadWithRelations[] | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ leads: LeadWithRelations[] }>("/api/leads")
      .then((d) => setLeads(d.leads))
      .catch((err) => setError(err instanceof Error ? err.message : "Ошибка"));
  }, []);

  if (error) return <p className="text-danger">{error}</p>;
  if (!leads) return <p className="text-muted">Загрузка доски…</p>;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Перетащите карточку, чтобы сменить статус
        </p>
        <button className="btn btn-primary" type="button" onClick={() => setOpen(true)}>
          <Plus size={16} /> Новая заявка
        </button>
      </div>
      <KanbanBoard leads={leads} onLeadsChange={setLeads} user={user} />
      {open && (
        <Modal title="Новая заявка" onClose={() => setOpen(false)} wide>
          <LeadForm
            user={user}
            onDone={(lead) => {
              setLeads((prev) => [lead, ...(prev ?? [])]);
              setOpen(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
