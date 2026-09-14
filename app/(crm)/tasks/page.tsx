"use client";

import { useEffect, useState } from "react";
import { TaskForm } from "@/components/forms/TaskForm";
import { useSession } from "@/components/layout/SessionContext";
import { TaskRow } from "@/components/tasks/TaskRow";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/client";
import { isOverdue } from "@/lib/utils";
import type { TaskWithRelations } from "@/types/crm.types";

export default function TasksPage() {
  const { user, setOverdueTasks } = useSession();
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<{ tasks: TaskWithRelations[] }>(`/api/tasks?scope=${scope}`)
      .then((data) => {
        if (!cancelled) setTasks(data.tasks);
      })
      .catch(() => {
        if (!cancelled) setTasks([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scope]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl bg-paper-2 p-1 text-sm">
          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 ${scope === "mine" ? "bg-card shadow-sm" : ""}`}
            onClick={() => setScope("mine")}
          >
            Мои задачи
          </button>
          {user.role === "admin" && (
            <button
              type="button"
              className={`rounded-lg px-3 py-1.5 ${scope === "all" ? "bg-card shadow-sm" : ""}`}
              onClick={() => setScope("all")}
            >
              Все
            </button>
          )}
        </div>
        <button className="btn btn-primary ml-auto" type="button" onClick={() => setOpen(true)}>
          + Задача
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <p className="p-6 text-muted">Загрузка…</p>
        ) : tasks.length === 0 ? (
          <p className="p-6 text-muted">Задач нет</p>
        ) : (
          <ul>
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                user={user}
                onBadgeDelta={(delta) => {
                  setOverdueTasks((n) => Math.max(0, n + delta));
                }}
              />
            ))}
          </ul>
        )}
      </div>

      {open && (
        <Modal title="Новая задача" onClose={() => setOpen(false)}>
          <TaskForm
            onDone={(task) => {
              setTasks((prev) => [task, ...prev]);
              if (
                isOverdue(task.due_date, task.status) &&
                (user.role === "admin" || task.assigned_to === user.id)
              ) {
                setOverdueTasks((n) => n + 1);
              }
              setOpen(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
