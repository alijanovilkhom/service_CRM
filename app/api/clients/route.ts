import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/turso";
import { jsonError, requireUser } from "@/lib/api";

function mapClient(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    name: String(row.name),
    phone: String(row.phone),
    email: row.email == null ? null : String(row.email),
    notes: row.notes == null ? null : String(row.notes),
    created_at: String(row.created_at),
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const db = await getDb();

  const result = q
    ? await db.execute({
        sql: `select * from clients
              where name like ? or phone like ? or ifnull(email, '') like ?
              order by created_at desc`,
        args: [`%${q}%`, `%${q}%`, `%${q}%`],
      })
    : await db.execute("select * from clients order by created_at desc");

  return NextResponse.json({
    clients: result.rows.map((row) => mapClient(row as Record<string, unknown>)),
  });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  let body: { name?: string; phone?: string; email?: string; notes?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректное тело запроса", 400);
  }

  const name = body.name?.trim();
  const phone = body.phone?.trim();
  if (!name || !phone) {
    return jsonError("Имя и телефон обязательны", 400);
  }

  const db = await getDb();
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const email = body.email?.trim() || null;
  const notes = body.notes?.trim() || null;

  await db.execute({
    sql: `insert into clients (id, name, phone, email, notes, created_at)
          values (?, ?, ?, ?, ?, ?)`,
    args: [id, name, phone, email, notes, createdAt],
  });

  return NextResponse.json(
    { client: { id, name, phone, email, notes, created_at: createdAt } },
    { status: 201 },
  );
}
