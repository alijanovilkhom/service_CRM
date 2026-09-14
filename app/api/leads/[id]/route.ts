import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/turso";
import { jsonError, requireUser } from "@/lib/api";
import { LEAD_SOURCES, LEAD_STATUSES } from "@/lib/constants";
import type { LeadSource, LeadStatus } from "@/types/crm.types";

const SOURCES = new Set(LEAD_SOURCES.map((s) => s.id));
const STATUSES = new Set(LEAD_STATUSES.map((s) => s.id));

const LEAD_SELECT = `select l.*, c.name as client_name, c.phone as client_phone, u.name as assignee_name
                     from leads l
                     join clients c on c.id = l.client_id
                     left join users u on u.id = l.assigned_to`;

function mapLead(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    client_id: String(row.client_id),
    source: String(row.source) as LeadSource,
    status: String(row.status) as LeadStatus,
    assigned_to: row.assigned_to == null ? null : String(row.assigned_to),
    value: row.value == null ? null : Number(row.value),
    notes: row.notes == null ? null : String(row.notes),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    client_name: String(row.client_name),
    client_phone: String(row.client_phone),
    assignee_name: row.assignee_name == null ? null : String(row.assignee_name),
  };
}

async function loadLead(id: string) {
  const db = await getDb();
  const result = await db.execute({
    sql: `${LEAD_SELECT} where l.id = ?`,
    args: [id],
  });
  const row = result.rows[0] as Record<string, unknown> | undefined;
  return row ? mapLead(row) : null;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const lead = await loadLead(id);
  if (!lead) return jsonError("Заявка не найдена", 404);

  if (auth.user.role !== "admin" && lead.assigned_to !== auth.user.id) {
    return jsonError("Недостаточно прав", 403);
  }

  const db = await getDb();
  const tasks = await db.execute({
    sql: `select t.*, u.name as assignee_name
          from tasks t
          join users u on u.id = t.assigned_to
          where t.lead_id = ?
          order by t.created_at desc`,
    args: [id],
  });

  return NextResponse.json({
    lead,
    tasks: tasks.rows.map((row) => ({
      id: String(row.id),
      lead_id: row.lead_id == null ? null : String(row.lead_id),
      client_id: row.client_id == null ? null : String(row.client_id),
      assigned_to: String(row.assigned_to),
      title: String(row.title),
      due_date: row.due_date == null ? null : String(row.due_date),
      status: String(row.status),
      created_at: String(row.created_at),
      assignee_name: String(row.assignee_name),
    })),
  });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const existing = await loadLead(id);
  if (!existing) return jsonError("Заявка не найдена", 404);

  if (auth.user.role !== "admin" && existing.assigned_to !== auth.user.id) {
    return jsonError("Недостаточно прав", 403);
  }

  let body: {
    status?: LeadStatus;
    assigned_to?: string | null;
    notes?: string | null;
    value?: number | null;
    source?: LeadSource;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректное тело запроса", 400);
  }

  const fields: string[] = ["updated_at = ?"];
  const args: (string | number | null)[] = [new Date().toISOString()];

  if (body.status !== undefined) {
    if (!STATUSES.has(body.status)) {
      return jsonError("Некорректный статус", 400);
    }
    fields.push("status = ?");
    args.push(body.status);
  }

  if (body.notes !== undefined) {
    fields.push("notes = ?");
    args.push(body.notes?.trim() || null);
  }

  if (body.value !== undefined) {
    fields.push("value = ?");
    args.push(
      typeof body.value === "number" && Number.isFinite(body.value)
        ? body.value
        : null,
    );
  }

  if (body.source !== undefined) {
    if (!SOURCES.has(body.source)) {
      return jsonError("Некорректный источник", 400);
    }
    fields.push("source = ?");
    args.push(body.source);
  }

  if (body.assigned_to !== undefined) {
    if (auth.user.role !== "admin") {
      return jsonError("Только администратор может переназначить заявку", 403);
    }
    fields.push("assigned_to = ?");
    args.push(body.assigned_to || null);
  }

  const db = await getDb();
  args.push(id);
  await db.execute({
    sql: `update leads set ${fields.join(", ")} where id = ?`,
    args,
  });

  const lead = await loadLead(id);
  return NextResponse.json({ lead });
}
