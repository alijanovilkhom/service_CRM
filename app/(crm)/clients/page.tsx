"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ClientForm } from "@/components/forms/ClientForm";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/client";
import { formatDate } from "@/lib/utils";
import type { Client } from "@/types/crm.types";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load(query: string) {
    setLoading(true);
    const data = await api<{ clients: Client[] }>(
      `/api/clients${query ? `?q=${encodeURIComponent(query)}` : ""}`,
    );
    setClients(data.clients);
    setLoading(false);
  }

  useEffect(() => {
    const t = window.setTimeout(() => {
      load(q).catch(() => setLoading(false));
    }, 200);
    return () => window.clearTimeout(t);
  }, [q]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          className="input max-w-sm"
          placeholder="Поиск по имени или телефону"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="btn btn-primary ml-auto" type="button" onClick={() => setOpen(true)}>
          + Клиент
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-paper text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Имя</th>
              <th className="px-4 py-3 font-medium">Телефон</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Создан</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={4}>
                  Загрузка…
                </td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={4}>
                  Клиенты не найдены
                </td>
              </tr>
            ) : (
              clients.map((c) => (
                <tr key={c.id} className="border-t border-line hover:bg-paper/60">
                  <td className="px-4 py-3">
                    <Link href={`/clients/${c.id}`} className="font-medium hover:text-copper">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{c.phone}</td>
                  <td className="px-4 py-3 text-muted">{c.email ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(c.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <Modal title="Новый клиент" onClose={() => setOpen(false)}>
          <ClientForm
            onDone={(client) => {
              setClients((prev) => [client, ...prev]);
              setOpen(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
