"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { startTransition, useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
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
  const desiredRef = useRef<TaskStatus>(task.status);
  const serverRef = useRef<TaskStatus>(task.status);
  const flushingRef = useRef(false);

  useEffect(() => {
    setStatus(task.status);
    desiredRef.current = task.status;
    serverRef.current = task.status;
  }, [task.status]);

  const done = status === "done";
  const overdue = isOverdue(task.due_date, status);

  function applyBadge(from: TaskStatus, to: TaskStatus) {
    const wasBadge = affectsBadge(task.due_date, from, task.assigned_to, user);
    const willBadge = affectsBadge(task.due_date, to, task.assigned_to, user);
    if (wasBadge === willBadge) return;
    startTransition(() => {
      onBadgeDelta(willBadge ? 1 : -1);
    });
  }

  async function flush() {
    if (flushingRef.current) return;
    flushingRef.current = true;
    try {
      while (desiredRef.current !== serverRef.current) {
        const sending = desiredRef.current;
        const res = await fetch(`/api/tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: sending }),
        });
        if (!res.ok) throw new Error("fail");
        serverRef.current = sending;
      }
    } catch {
      const from = desiredRef.current;
      desiredRef.current = serverRef.current;
      setStatus(serverRef.current);
      applyBadge(from, serverRef.current);
    } finally {
      flushingRef.current = false;
      if (desiredRef.current !== serverRef.current) void flush();
    }
  }

  function toggle() {
    const from = desiredRef.current;
    const next: TaskStatus = from === "done" ? "pending" : "done";
    desiredRef.current = next;
    setStatus(next);
    applyBadge(from, next);
    void flush();
  }

  function onPointerToggle(e: PointerEvent<HTMLButtonElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    toggle();
  }

  function onKeyToggle(e: MouseEvent<HTMLButtonElement>) {
    if (e.detail !== 0) return;
    toggle();
  }

  return (
    <li className="border-b border-line last:border-b-0">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onPointerDown={onPointerToggle}
          onClick={onKeyToggle}
          aria-pressed={done}
          aria-label={done ? "Вернуть в работу" : "Отметить выполненной"}
          className="flex size-8 shrink-0 items-center justify-center rounded-md"
        >
          <span
            className={`flex size-5 items-center justify-center rounded-md border ${
              done ? "border-copper bg-copper text-white" : "border-line bg-white"
            }`}
          >
            {done && <Check size={13} strokeWidth={3} />}
          </span>
        </button>
        <button
          type="button"
          onPointerDown={onPointerToggle}
          onClick={onKeyToggle}
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
