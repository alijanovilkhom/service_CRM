"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useState } from "react";
import { formatDate, isOverdue } from "@/lib/utils";
import type { SessionUser, TaskStatus, TaskWithRelations } from "@/types/crm.types";

function affectsBadge(
  dueDate: string | null,
  status: string,
  assignedTo: string,
  user: SessionUser,
): boolean {
  if (!isOverdue(dueDate, status)) return false;
  return user.role === "admin" || assignedTo === user.id;
}

export function TaskRow({
  task,
  user,
  onBadgeDelta,
}: {
  task: TaskWithRelations;
  user: SessionUser;
  onBadgeDelta: (delta: number) => void;
}) {
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [busy, setBusy] = useState(false);

  const done = status === "done";
  const overdue = isOverdue(task.due_date, status);

  async function toggle() {
    if (busy) return;
    const previous = status;
    const next: TaskStatus = previous === "done" ? "pending" : "done";
    const wasBadge = affectsBadge(task.due_date, previous, task.assigned_to, user);
    const willBadge = affectsBadge(task.due_date, next, task.assigned_to, user);

    setStatus(next);
    if (wasBadge !== willBadge) {
      onBadgeDelta(willBadge ? 1 : -1);
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error("fail");
    } catch {
      setStatus(previous);
      if (wasBadge !== willBadge) {
        onBadgeDelta(wasBadge ? 1 : -1);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="border-b border-line last:border-b-0">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={toggle}
          aria-pressed={done}
          className={`flex size-5 shrink-0 items-center justify-center rounded-md border ${
            done ? "border-copper bg-copper text-white" : "border-line bg-white"
          }`}
        >
          {done && <Check size={13} strokeWidth={3} />}
        </button>
        <button
          type="button"
          onClick={toggle}
          className="min-w-0 flex-1 cursor-pointer text-left"
        >
          <div className={done ? "text-muted line-through" : "font-medium"}>{task.title}</div>
          <div className="text-xs text-muted">
            {task.assignee_name}
            {task.client_name ? ` · ${task.client_name}` : ""}
          </div>
        </button>
        {task.lead_id && (
          <Link href={`/leads/${task.lead_id}`} className="shrink-0 text-xs text-copper">
            заявка
          </Link>
        )}
        <div className={`shrink-0 text-sm ${overdue ? "font-semibold text-danger" : "text-muted"}`}>
          {task.due_date ? formatDate(task.due_date) : "без срока"}
        </div>
      </div>
    </li>
  );
}
