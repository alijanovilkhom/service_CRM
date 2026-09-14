import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/turso";
import { jsonError, requireUser } from "@/lib/api";
import type { LeadSource, LeadStatus } from "@/types/crm.types";

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

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const db = await getDb();

  const clientResult = await db.execute({
    sql: "select * from clients where id = ?",
    args: [id],
  });
  const clientRow = clientResult.rows[0] as Record<string, unknown> | undefined;
  if (!clientRow) {
    return jsonError("Клиент не найден", 404);
  }

  let leadsSql = `select l.*, c.name as client_name, c.phone as client_phone, u.name as assignee_name
                  from leads l
                  join clients c on c.id = l.client_id
                  left join users u on u.id = l.assigned_to
                  where l.client_id = ?`;
  const args: string[] = [id];
  if (auth.user.role !== "admin") {
    leadsSql += " and l.assigned_to = ?";
    args.push(auth.user.id);
  }
  leadsSql += " order by l.created_at desc";

  const leadsResult = await db.execute({ sql: leadsSql, args });

  return NextResponse.json({
    client: {
      id: String(clientRow.id),
      name: String(clientRow.name),
      phone: String(clientRow.phone),
      email: clientRow.email == null ? null : String(clientRow.email),
      notes: clientRow.notes == null ? null : String(clientRow.notes),
      created_at: String(clientRow.created_at),
      leads: leadsResult.rows.map((row) => mapLead(row as Record<string, unknown>)),
    },
  });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  let body: { name?: string; phone?: string; email?: string | null; notes?: string | null };
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректное тело запроса", 400);
  }

  const db = await getDb();
  const existing = await db.execute({
    sql: "select id from clients where id = ?",
    args: [id],
  });
  if (existing.rows.length === 0) {
    return jsonError("Клиент не найден", 404);
  }

  const fields: string[] = [];
  const args: (string | null)[] = [];
  if (typeof body.name === "string" && body.name.trim()) {
    fields.push("name = ?");
    args.push(body.name.trim());
  }
  if (typeof body.phone === "string" && body.phone.trim()) {
    fields.push("phone = ?");
    args.push(body.phone.trim());
  }
  if (body.email !== undefined) {
    fields.push("email = ?");
    args.push(body.email?.trim() || null);
  }
  if (body.notes !== undefined) {
    fields.push("notes = ?");
    args.push(body.notes?.trim() || null);
  }

  if (fields.length === 0) {
    return jsonError("Нет полей для обновления", 400);
  }

  args.push(id);
  await db.execute({
    sql: `update clients set ${fields.join(", ")} where id = ?`,
    args,
  });

  const updated = await db.execute({
    sql: "select * from clients where id = ?",
    args: [id],
  });
  const row = updated.rows[0] as Record<string, unknown>;
  return NextResponse.json({
    client: {
      id: String(row.id),
      name: String(row.name),
      phone: String(row.phone),
      email: row.email == null ? null : String(row.email),
      notes: row.notes == null ? null : String(row.notes),
      created_at: String(row.created_at),
    },
  });
}
