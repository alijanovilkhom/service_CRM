import { NextResponse } from "next/server";
import { getDb } from "@/lib/turso";
import { jsonError, requireUser } from "@/lib/api";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { deleteLocalAvatar, isHttpUrl } from "@/lib/avatars";
import { mapUserRow, toSessionUser, USER_PUBLIC_COLUMNS } from "@/lib/users";

export async function PATCH(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  let body: {
    name?: string;
    email?: string;
    avatar_url?: string | null;
    current_password?: string;
    new_password?: string;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректное тело запроса", 400);
  }

  const db = await getDb();
  const current = await db.execute({
    sql: `select ${USER_PUBLIC_COLUMNS}, password_hash from users where id = ?`,
    args: [auth.user.id],
  });
  const row = current.rows[0] as Record<string, unknown> | undefined;
  if (!row) return jsonError("Пользователь не найден", 404);

  const fields: string[] = [];
  const args: (string | null)[] = [];

  if (typeof body.name === "string" && body.name.trim()) {
    fields.push("name = ?");
    args.push(body.name.trim());
  }

  if (typeof body.email === "string" && body.email.trim()) {
    const email = body.email.trim().toLowerCase();
    const taken = await db.execute({
      sql: "select id from users where email = ? and id != ?",
      args: [email, auth.user.id],
    });
    if (taken.rows.length > 0) {
      return jsonError("Этот email уже занят", 409);
    }
    fields.push("email = ?");
    args.push(email);
  }

  if (body.avatar_url !== undefined) {
    let next: string | null = null;
    if (typeof body.avatar_url === "string" && body.avatar_url.trim()) {
      const value = body.avatar_url.trim();
      if (!isHttpUrl(value) && !value.startsWith("/api/avatars/")) {
        return jsonError("Нужна ссылка http(s) или загруженный файл", 400);
      }
      next = value;
    }
    const prev = row.avatar_url == null ? null : String(row.avatar_url);
    if (prev && prev !== next) {
      await deleteLocalAvatar(prev);
    }
    fields.push("avatar_url = ?");
    args.push(next);
  }

  if (typeof body.new_password === "string" && body.new_password) {
    if (body.new_password.length < 6) {
      return jsonError("Пароль должен быть не короче 6 символов", 400);
    }
    const currentPassword = body.current_password ?? "";
    const ok = await verifyPassword(currentPassword, String(row.password_hash));
    if (!ok) {
      return jsonError("Неверный текущий пароль", 400);
    }
    fields.push("password_hash = ?");
    args.push(await hashPassword(body.new_password));
  }

  if (fields.length === 0) {
    return jsonError("Нет полей для обновления", 400);
  }

  args.push(auth.user.id);
  await db.execute({
    sql: `update users set ${fields.join(", ")} where id = ?`,
    args,
  });

  const updated = await db.execute({
    sql: `select ${USER_PUBLIC_COLUMNS} from users where id = ?`,
    args: [auth.user.id],
  });

  const user = mapUserRow(updated.rows[0] as Record<string, unknown>);
  return NextResponse.json({ user: toSessionUser(user) });
}
