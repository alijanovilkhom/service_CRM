"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { useToast } from "@/components/ui/ToastProvider";
import type { User, UserRole } from "@/types/crm.types";

export function UserForm({ onDone }: { onDone: (user: User) => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("manager");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await api<{ user: User }>("/api/users", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role }),
      });
      toast("Сотрудник создан");
      onDone(data.user);
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
        Email
        <input
          className="input mt-1"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <label className="text-sm">
        Временный пароль
        <input
          className="input mt-1"
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
      </label>
      <label className="text-sm">
        Роль
        <select
          className="input mt-1"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
        >
          <option value="manager">Менеджер</option>
          <option value="admin">Администратор</option>
        </select>
      </label>
      <button className="btn btn-primary mt-2" disabled={saving}>
        {saving ? "Создание…" : "Создать сотрудника"}
      </button>
    </form>
  );
}
