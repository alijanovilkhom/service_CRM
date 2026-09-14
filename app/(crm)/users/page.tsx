"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { UserForm } from "@/components/forms/UserForm";
import { useSession } from "@/components/layout/SessionContext";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { api } from "@/lib/client";
import { formatDate } from "@/lib/utils";
import type { User } from "@/types/crm.types";

export default function UsersPage() {
  const { user: me } = useSession();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ users: User[] }>("/api/users")
      .then((d) => setUsers(d.users))
      .catch((err) => toast(err instanceof Error ? err.message : "Ошибка", "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  async function patch(id: string, body: Partial<Pick<User, "role" | "is_active">>) {
    try {
      const data = await api<{ user: User }>("/api/users", {
        method: "PATCH",
        body: JSON.stringify({ id, ...body }),
      });
      setUsers((prev) => prev.map((u) => (u.id === id ? data.user : u)));
    } catch (err) {
      toast(err instanceof Error ? err.message : "Ошибка", "error");
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button className="btn btn-primary" type="button" onClick={() => setOpen(true)}>
          + Сотрудник
        </button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-paper text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Имя</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Роль</th>
              <th className="px-4 py-3 font-medium">Статус</th>
              <th className="px-4 py-3 font-medium">Создан</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={6}>
                  Загрузка…
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={u.name} src={u.avatar_url} size={28} />
                      <span className="font-medium">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">
                    {u.id === me.id ? (
                      <span>Админ</span>
                    ) : (
                      <select
                        className="input py-1"
                        value={u.role}
                        onChange={(e) =>
                          patch(u.id, { role: e.target.value as User["role"] })
                        }
                      >
                        <option value="manager">Менеджер</option>
                        <option value="admin">Админ</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`chip ${u.is_active ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                      {u.is_active ? "Активен" : "Отключён"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {u.id !== me.id && (
                      <button
                        type="button"
                        className="btn btn-ghost py-1 text-xs"
                        onClick={() => patch(u.id, { is_active: !u.is_active })}
                      >
                        {u.is_active ? "Деактивировать" : "Включить"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <Modal title="Новый сотрудник" onClose={() => setOpen(false)}>
          <UserForm
            onDone={(user) => {
              setUsers((prev) => [user, ...prev]);
              setOpen(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
