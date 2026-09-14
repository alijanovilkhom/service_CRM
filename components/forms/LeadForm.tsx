"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { LEAD_SOURCES } from "@/lib/constants";
import { useToast } from "@/components/ui/ToastProvider";
import type { Client, LeadWithRelations, SessionUser, User } from "@/types/crm.types";

export function LeadForm({
  user,
  presetClient,
  onDone,
}: {
  user: SessionUser;
  presetClient?: Pick<Client, "id" | "name">;
  onDone: (lead: LeadWithRelations) => void;
}) {
  const { toast } = useToast();
  const [mode, setMode] = useState<"existing" | "new">(presetClient ? "existing" : "existing");
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [clientId, setClientId] = useState(presetClient?.id ?? "");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [source, setSource] = useState("manual");
  const [assignedTo, setAssignedTo] = useState(user.id);
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ clients: Client[] }>("/api/clients")
      .then((d) => setClients(d.clients))
      .catch(() => undefined);
    if (user.role === "admin") {
      api<{ users: User[] }>("/api/users")
        .then((d) => setUsers(d.users.filter((u) => u.is_active)))
        .catch(() => undefined);
    }
  }, [user.role]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        source,
        notes,
        value: value ? Number(value) : null,
        assigned_to: user.role === "admin" ? assignedTo : user.id,
      };
      if (mode === "new") {
        payload.client = { name: newName, phone: newPhone, email: newEmail };
      } else {
        payload.client_id = clientId;
      }
      const data = await api<{ lead: LeadWithRelations }>("/api/leads", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast("Заявка создана");
      onDone(data.lead);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Ошибка", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      {!presetClient && (
        <div className="flex gap-2 rounded-xl bg-paper p-1 text-sm">
          <button
            type="button"
            className={`flex-1 rounded-lg py-1.5 ${mode === "existing" ? "bg-card shadow-sm" : ""}`}
            onClick={() => setMode("existing")}
          >
            Существующий клиент
          </button>
          <button
            type="button"
            className={`flex-1 rounded-lg py-1.5 ${mode === "new" ? "bg-card shadow-sm" : ""}`}
            onClick={() => setMode("new")}
          >
            Новый клиент
          </button>
        </div>
      )}

      {presetClient || mode === "existing" ? (
        <label className="text-sm">
          Клиент
          <select
            className="input mt-1"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
            disabled={Boolean(presetClient)}
          >
            <option value="">Выберите клиента</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.phone}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <>
          <label className="text-sm">
            Имя клиента
            <input className="input mt-1" value={newName} onChange={(e) => setNewName(e.target.value)} required />
          </label>
          <label className="text-sm">
            Телефон
            <input className="input mt-1" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} required />
          </label>
          <label className="text-sm">
            Email
            <input className="input mt-1" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
          </label>
        </>
      )}

      <label className="text-sm">
        Источник
        <select className="input mt-1" value={source} onChange={(e) => setSource(e.target.value)}>
          {LEAD_SOURCES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      {user.role === "admin" && (
        <label className="text-sm">
          Назначить
          <select className="input mt-1" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
            <option value="">Не назначена</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="text-sm">
        Сумма, ₽
        <input
          className="input mt-1"
          type="number"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </label>
      <label className="text-sm">
        Заметки
        <textarea className="input mt-1 min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <button className="btn btn-primary mt-2" disabled={saving}>
        {saving ? "Создание…" : "Создать заявку"}
      </button>
    </form>
  );
}
