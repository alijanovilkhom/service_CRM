"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { TaskForm } from "@/components/forms/TaskForm";
import { useSession } from "@/components/layout/SessionContext";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/client";
import { LEAD_SOURCES, LEAD_STATUSES, statusLabel } from "@/lib/constants";
import { formatDateTime, formatMoney, isOverdue } from "@/lib/utils";
import type { LeadSource, LeadStatus, LeadWithRelations, TaskWithRelations, User } from "@/types/crm.types";

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useSession();
  const [lead, setLead] = useState<LeadWithRelations | null>(null);
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const [value, setValue] = useState("");
  const [taskOpen, setTaskOpen] = useState(false);

  async function load() {
    try {
      const data = await api<{ lead: LeadWithRelations; tasks: TaskWithRelations[] }>(
        `/api/leads/${id}`,
      );
      setLead(data.lead);
      setTasks(data.tasks);
      setNotes(data.lead.notes ?? "");
      setValue(data.lead.value != null ? String(data.lead.value) : "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  }

  useEffect(() => {
    load();
    if (user.role === "admin") {
      api<{ users: User[] }>("/api/users")
        .then((d) => setUsers(d.users.filter((u) => u.is_active)))
        .catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user.role]);

  async function patch(body: Record<string, unknown>) {
    try {
      const data = await api<{ lead: LeadWithRelations }>(`/api/leads/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setLead(data.lead);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  }

  if (error) {
    return (
      <div className="card p-6">
        <p className="text-danger">{error}</p>
        <Link href="/leads" className="mt-3 inline-block text-sm text-copper">
          К доске заявок
        </Link>
      </div>
    );
  }

  if (!lead) return <p className="text-muted">Загрузка…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/leads" className="text-sm text-muted hover:text-ink">
        ← К доске
      </Link>
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl">{lead.client_name}</h2>
            <Link href={`/clients/${lead.client_id}`} className="text-sm text-copper">
              Карточка клиента · {lead.client_phone}
            </Link>
          </div>
          <div className="text-sm text-muted">Создана {formatDateTime(lead.created_at)}</div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Статус
            <select
              className="input mt-1"
              value={lead.status}
              onChange={(e) => patch({ status: e.target.value as LeadStatus })}
            >
              {LEAD_STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Источник
            <select
              className="input mt-1"
              value={lead.source}
              onChange={(e) => patch({ source: e.target.value as LeadSource })}
            >
              {LEAD_SOURCES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Назначена
            {user.role === "admin" ? (
              <select
                className="input mt-1"
                value={lead.assigned_to ?? ""}
                onChange={(e) => patch({ assigned_to: e.target.value || null })}
              >
                <option value="">Не назначена</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="input mt-1 bg-paper">{lead.assignee_name ?? "—"}</div>
            )}
          </label>
          <label className="text-sm">
            Сумма, ₽
            <input
              className="input mt-1"
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={() =>
                patch({ value: value === "" ? null : Number(value) })
              }
            />
          </label>
        </div>

        <label className="mt-4 block text-sm">
          Заметки
          <textarea
            className="input mt-1 min-h-28"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => patch({ notes })}
          />
        </label>
        <p className="mt-1 text-xs text-muted">Текущая сумма: {formatMoney(lead.value)}</p>
      </div>

      <div className="card p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Задачи по заявке</h3>
          <button className="btn btn-ghost" type="button" onClick={() => setTaskOpen(true)}>
            + Задача
          </button>
        </div>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted">Пока нет задач</p>
        ) : (
          <ul className="divide-y divide-line">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className={t.status === "done" ? "text-muted line-through" : ""}>{t.title}</span>
                <span
                  className={
                    isOverdue(t.due_date, t.status) ? "font-medium text-danger" : "text-muted"
                  }
                >
                  {t.due_date ?? "без срока"} · {statusLabel(lead.status)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {taskOpen && (
        <Modal title="Новая задача" onClose={() => setTaskOpen(false)}>
          <TaskForm
            leadId={lead.id}
            clientId={lead.client_id}
            onDone={(task) => {
              setTasks((prev) => [task, ...prev]);
              setTaskOpen(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
