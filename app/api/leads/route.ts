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

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const db = await getDb();
  const result =
    auth.user.role === "admin"
      ? await db.execute(`${LEAD_SELECT} order by l.created_at desc`)
      : await db.execute({
          sql: `${LEAD_SELECT} where l.assigned_to = ? order by l.created_at desc`,
          args: [auth.user.id],
        });

  return NextResponse.json({
    leads: result.rows.map((row) => mapLead(row as Record<string, unknown>)),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  let body: {
    client_id?: string;
    client?: { name?: string; phone?: string; email?: string };
    source?: LeadSource;
    status?: LeadStatus;
    assigned_to?: string | null;
    value?: number | null;
    notes?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректное тело запроса", 400);
  }

  const db = await getDb();
  let clientId = body.client_id?.trim();

  if (!clientId && body.client?.name && body.client?.phone) {
    clientId = crypto.randomUUID();
    await db.execute({
      sql: `insert into clients (id, name, phone, email, notes, created_at)
            values (?, ?, ?, ?, null, ?)`,
      args: [
        clientId,
        body.client.name.trim(),
        body.client.phone.trim(),
        body.client.email?.trim() || null,
        new Date().toISOString(),
      ],
    });
  }

  if (!clientId) {
    return jsonError("client_id обязателен при создании заявки", 400);
  }

  const client = await db.execute({
    sql: "select id from clients where id = ?",
    args: [clientId],
  });
  if (client.rows.length === 0) {
    return jsonError("Клиент не найден", 400);
  }

  const source: LeadSource =
    body.source && SOURCES.has(body.source) ? body.source : "manual";
  const status: LeadStatus =
    body.status && STATUSES.has(body.status) ? body.status : "new";
  const assignedTo =
    auth.user.role === "admin"
      ? body.assigned_to || null
      : auth.user.id;
  const value =
    typeof body.value === "number" && Number.isFinite(body.value)
      ? body.value
      : null;
  const notes = body.notes?.trim() || null;
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await db.execute({
    sql: `insert into leads (id, client_id, source, status, assigned_to, value, notes, created_at, updated_at)
          values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, clientId, source, status, assignedTo, value, notes, now, now],
  });

  const created = await db.execute({
    sql: `${LEAD_SELECT} where l.id = ?`,
    args: [id],
  });

  return NextResponse.json(
    { lead: mapLead(created.rows[0] as Record<string, unknown>) },
    { status: 201 },
  );
}
