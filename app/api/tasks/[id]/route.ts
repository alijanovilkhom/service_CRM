import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/turso";
import { jsonError, requireJwtUser, requireUser } from "@/lib/api";
import type { LeadStatus, TaskStatus } from "@/types/crm.types";

const TASK_SELECT = `select t.*,
       u.name as assignee_name,
       coalesce(c.name, c2.name) as client_name,
       l.status as lead_status
from tasks t
join users u on u.id = t.assigned_to
left join leads l on l.id = t.lead_id
left join clients c on c.id = t.client_id
left join clients c2 on c2.id = l.client_id`;

function mapTask(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    lead_id: row.lead_id == null ? null : String(row.lead_id),
    client_id: row.client_id == null ? null : String(row.client_id),
    assigned_to: String(row.assigned_to),
    title: String(row.title),
    due_date: row.due_date == null ? null : String(row.due_date),
    status: String(row.status) as TaskStatus,
    created_at: String(row.created_at),
    assignee_name: String(row.assignee_name),
    client_name: row.client_name == null ? null : String(row.client_name),
    lead_status: row.lead_status == null ? null : (String(row.lead_status) as LeadStatus),
  };
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  let body: { status?: TaskStatus; due_date?: string | null; title?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректное тело запроса", 400);
  }

  if (
    body.status !== undefined &&
    body.due_date === undefined &&
    body.title === undefined
  ) {
    if (body.status !== "pending" && body.status !== "done") {
      return jsonError("Некорректный статус задачи", 400);
    }

    const auth = await requireJwtUser();
    if (auth.error) return auth.error;

    const db = await getDb();
    const result = await db.execute({
      sql: `update tasks set status = ?
            where id = ?
              and (? = 'admin' or assigned_to = ?)`,
      args: [body.status, id, auth.user.role, auth.user.id],
    });
    if (result.rowsAffected === 0) {
      return jsonError("Задача не найдена", 404);
    }
    return NextResponse.json({ ok: true, status: body.status });
  }

  const auth = await requireUser();
  if (auth.error) return auth.error;

  const db = await getDb();
  const existing = await db.execute({
    sql: "select * from tasks where id = ?",
    args: [id],
  });
  const row = existing.rows[0];
  if (!row) return jsonError("Задача не найдена", 404);

  if (auth.user.role !== "admin" && String(row.assigned_to) !== auth.user.id) {
    return jsonError("Недостаточно прав", 403);
  }

  const fields: string[] = [];
  const args: (string | null)[] = [];

  if (body.status !== undefined) {
    if (body.status !== "pending" && body.status !== "done") {
      return jsonError("Некорректный статус задачи", 400);
    }
    fields.push("status = ?");
    args.push(body.status);
  }
  if (body.due_date !== undefined) {
    fields.push("due_date = ?");
    args.push(body.due_date || null);
  }
  if (typeof body.title === "string" && body.title.trim()) {
    fields.push("title = ?");
    args.push(body.title.trim());
  }

  if (fields.length === 0) {
    return jsonError("Нет полей для обновления", 400);
  }

  args.push(id);
  await db.execute({
    sql: `update tasks set ${fields.join(", ")} where id = ?`,
    args,
  });

  const updated = await db.execute({
    sql: `${TASK_SELECT} where t.id = ?`,
    args: [id],
  });

  return NextResponse.json({
    task: mapTask(updated.rows[0] as Record<string, unknown>),
  });
}
