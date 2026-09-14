import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/turso";
import { jsonError, requireUser } from "@/lib/api";
import type { LeadStatus, TaskStatus } from "@/types/crm.types";

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

const TASK_SELECT = `select t.*,
       u.name as assignee_name,
       coalesce(c.name, c2.name) as client_name,
       l.status as lead_status
from tasks t
join users u on u.id = t.assigned_to
left join leads l on l.id = t.lead_id
left join clients c on c.id = t.client_id
left join clients c2 on c2.id = l.client_id`;

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const scope = request.nextUrl.searchParams.get("scope") ?? "mine";
  const db = await getDb();

  const seeAll = auth.user.role === "admin" && scope === "all";
  const result = seeAll
    ? await db.execute(`${TASK_SELECT} order by case when t.due_date is null then 1 else 0 end, t.due_date asc`)
    : await db.execute({
        sql: `${TASK_SELECT} where t.assigned_to = ? order by case when t.due_date is null then 1 else 0 end, t.due_date asc`,
        args: [auth.user.id],
      });

  return NextResponse.json({
    tasks: result.rows.map((row) => mapTask(row as Record<string, unknown>)),
  });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  let body: {
    title?: string;
    due_date?: string | null;
    lead_id?: string | null;
    client_id?: string | null;
    assigned_to?: string;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректное тело запроса", 400);
  }

  const title = body.title?.trim();
  if (!title) {
    return jsonError("Название задачи обязательно", 400);
  }

  const assignedTo =
    auth.user.role === "admin" && body.assigned_to
      ? body.assigned_to
      : auth.user.id;

  const db = await getDb();
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const dueDate = body.due_date?.trim() || null;
  const leadId = body.lead_id || null;
  let clientId = body.client_id || null;

  if (leadId) {
    const lead = await db.execute({
      sql: "select id, client_id, assigned_to from leads where id = ?",
      args: [leadId],
    });
    const row = lead.rows[0];
    if (!row) return jsonError("Заявка не найдена", 400);
    if (auth.user.role !== "admin" && String(row.assigned_to) !== auth.user.id) {
      return jsonError("Недостаточно прав", 403);
    }
    if (!clientId) clientId = String(row.client_id);
  }

  await db.execute({
    sql: `insert into tasks (id, lead_id, client_id, assigned_to, title, due_date, status, created_at)
          values (?, ?, ?, ?, ?, ?, 'pending', ?)`,
    args: [id, leadId, clientId, assignedTo, title, dueDate, createdAt],
  });

  const created = await db.execute({
    sql: `${TASK_SELECT} where t.id = ?`,
    args: [id],
  });

  return NextResponse.json(
    { task: mapTask(created.rows[0] as Record<string, unknown>) },
    { status: 201 },
  );
}
