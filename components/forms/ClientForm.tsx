"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { useToast } from "@/components/ui/ToastProvider";
import type { Client } from "@/types/crm.types";

export function ClientForm({
  initial,
  onDone,
}: {
  initial?: Partial<Client>;
  onDone: (client: Client) => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (initial?.id) {
        const data = await api<{ client: Client }>(`/api/clients/${initial.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name, phone, email, notes }),
        });
        toast("Клиент сохранён");
        onDone(data.client);
      } else {
        const data = await api<{ client: Client }>("/api/clients", {
          method: "POST",
          body: JSON.stringify({ name, phone, email, notes }),
        });
        toast("Клиент создан");
        onDone(data.client);
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Ошибка", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label className="text-sm">
        Имя
        <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className="text-sm">
        Телефон
        <input className="input mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} required />
      </label>
      <label className="text-sm">
        Email
        <input
          className="input mt-1"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="text-sm">
        Заметки
        <textarea
          className="input mt-1 min-h-24"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>
      <button className="btn btn-primary mt-2" disabled={saving}>
        {saving ? "Сохранение…" : "Сохранить"}
      </button>
    </form>
  );
}

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  useEffect(() => {
    api<{ clients: Client[] }>("/api/clients")
      .then((d) => setClients(d.clients))
      .catch(() => setClients([]));
  }, []);
  return clients;
}
