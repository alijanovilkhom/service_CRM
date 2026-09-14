"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ClientForm } from "@/components/forms/ClientForm";
import { LeadForm } from "@/components/forms/LeadForm";
import { useSession } from "@/components/layout/SessionContext";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/client";
import { statusLabel } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/utils";
import type { ClientWithLeads, LeadWithRelations } from "@/types/crm.types";

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useSession();
  const [client, setClient] = useState<ClientWithLeads | null>(null);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);

  useEffect(() => {
    api<{ client: ClientWithLeads }>(`/api/clients/${id}`)
      .then((d) => setClient(d.client))
      .catch((err) => setError(err instanceof Error ? err.message : "Ошибка"));
  }, [id]);

  if (error) return <p className="text-danger">{error}</p>;
  if (!client) return <p className="text-muted">Загрузка…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/clients" className="text-sm text-muted hover:text-ink">
        ← К списку клиентов
      </Link>
      <div className="card p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl">{client.name}</h2>
            <p className="mt-1 text-sm">{client.phone}</p>
            <p className="text-sm text-muted">{client.email ?? "без email"}</p>
          </div>
          <button className="btn btn-ghost" type="button" onClick={() => setEditOpen(true)}>
            Изменить
          </button>
        </div>
        {client.notes && <p className="mt-4 text-sm">{client.notes}</p>}
      </div>

      <div className="card p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">История заявок</h3>
          <button className="btn btn-primary" type="button" onClick={() => setLeadOpen(true)}>
            + Заявка
          </button>
        </div>
        {client.leads.length === 0 ? (
          <p className="text-sm text-muted">Заявок пока нет</p>
        ) : (
          <ul className="divide-y divide-line">
            {client.leads.map((lead) => (
              <li key={lead.id} className="py-3">
                <Link href={`/leads/${lead.id}`} className="flex items-center justify-between gap-3">
                  <span>
                    {statusLabel(lead.status)}
                    <span className="ml-2 text-muted">{formatDate(lead.created_at)}</span>
                  </span>
                  <span className="text-sm">{formatMoney(lead.value)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editOpen && (
        <Modal title="Клиент" onClose={() => setEditOpen(false)}>
          <ClientForm
            initial={client}
            onDone={(updated) => {
              setClient({ ...client, ...updated });
              setEditOpen(false);
            }}
          />
        </Modal>
      )}
      {leadOpen && (
        <Modal title="Новая заявка" onClose={() => setLeadOpen(false)} wide>
          <LeadForm
            user={user}
            presetClient={client}
            onDone={(lead: LeadWithRelations) => {
              setClient({ ...client, leads: [lead, ...client.leads] });
              setLeadOpen(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
