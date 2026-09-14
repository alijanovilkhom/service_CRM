"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { useToast } from "@/components/ui/ToastProvider";
import type { TaskWithRelations } from "@/types/crm.types";

export function TaskForm({
  leadId,
  clientId,
  onDone,
}: {
  leadId?: string | null;
  clientId?: string | null;
  onDone: (task: TaskWithRelations) => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await api<{ task: TaskWithRelations }>("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          title,
          due_date: dueDate || null,
          lead_id: leadId || null,
          client_id: clientId || null,
        }),
      });
      toast("Задача создана");
      onDone(data.task);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Ошибка", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label className="text-sm">
        Название
        <input className="input mt-1" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label className="text-sm">
        Срок
        <input
          className="input mt-1"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </label>
      <button className="btn btn-primary mt-2" disabled={saving}>
        {saving ? "Создание…" : "Создать задачу"}
      </button>
    </form>
  );
}
