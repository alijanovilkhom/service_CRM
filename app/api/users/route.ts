import { NextResponse } from "next/server";
import { getDb } from "@/lib/turso";
import { jsonError, requireAdmin } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { mapUserRow, USER_PUBLIC_COLUMNS } from "@/lib/users";
import type { UserRole } from "@/types/crm.types";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const db = await getDb();
  const result = await db.execute(
    `select ${USER_PUBLIC_COLUMNS} from users order by created_at desc`,
  );

  return NextResponse.json({
    users: result.rows.map((row) => mapUserRow(row as Record<string, unknown>)),
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  let body: {
    name?: string;
    email?: string;
    password?: string;
    role?: UserRole;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректное тело запроса", 400);
  }

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const role: UserRole = body.role === "admin" ? "admin" : "manager";

  if (!name || !email || !password) {
    return jsonError("Имя, email и пароль обязательны", 400);
  }
  if (password.length < 6) {
    return jsonError("Пароль должен быть не короче 6 символов", 400);
  }

  const db = await getDb();
  const exists = await db.execute({
    sql: "select id from users where email = ?",
    args: [email],
  });
  if (exists.rows.length > 0) {
    return jsonError("Пользователь с таким email уже есть", 409);
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const passwordHash = await hashPassword(password);

  await db.execute({
    sql: `insert into users (id, name, email, password_hash, role, is_active, created_at)
          values (?, ?, ?, ?, ?, 1, ?)`,
    args: [id, name, email, passwordHash, role, createdAt],
  });

  return NextResponse.json(
    {
      user: {
        id,
        name,
        email,
        role,
        is_active: true,
        created_at: createdAt,
        avatar_url: null,
      },
    },
    { status: 201 },
  );
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  let body: {
    id?: string;
    role?: UserRole;
    is_active?: boolean;
    name?: string;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректное тело запроса", 400);
  }

  if (!body.id) return jsonError("id обязателен", 400);
  if (body.id === auth.user.id && body.is_active === false) {
    return jsonError("Нельзя деактивировать собственный аккаунт", 400);
  }
  if (body.id === auth.user.id && body.role && body.role !== "admin") {
    return jsonError("Нельзя снять с себя роль администратора", 400);
  }

  const db = await getDb();
  const existing = await db.execute({
    sql: "select id from users where id = ?",
    args: [body.id],
  });
  if (existing.rows.length === 0) {
    return jsonError("Пользователь не найден", 404);
  }

  const fields: string[] = [];
  const args: (string | number)[] = [];

  if (body.role === "admin" || body.role === "manager") {
    fields.push("role = ?");
    args.push(body.role);
  }
  if (typeof body.is_active === "boolean") {
    fields.push("is_active = ?");
    args.push(body.is_active ? 1 : 0);
  }
  if (typeof body.name === "string" && body.name.trim()) {
    fields.push("name = ?");
    args.push(body.name.trim());
  }

  if (fields.length === 0) {
    return jsonError("Нет полей для обновления", 400);
  }

  args.push(body.id);
  await db.execute({
    sql: `update users set ${fields.join(", ")} where id = ?`,
    args,
  });

  const updated = await db.execute({
    sql: `select ${USER_PUBLIC_COLUMNS} from users where id = ?`,
    args: [body.id],
  });

  return NextResponse.json({
    user: mapUserRow(updated.rows[0] as Record<string, unknown>),
  });
}
