import { NextResponse } from "next/server";
import { jsonError, requireUser } from "@/lib/api";
import { deleteLocalAvatar, saveAvatarFile } from "@/lib/avatars";
import { getDb } from "@/lib/turso";
import { mapUserRow, toSessionUser, USER_PUBLIC_COLUMNS } from "@/lib/users";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return jsonError("Выберите изображение", 400);
  }

  try {
    const avatarUrl = await saveAvatarFile(auth.user.id, file);
    const db = await getDb();
    const prev = await db.execute({
      sql: "select avatar_url from users where id = ?",
      args: [auth.user.id],
    });
    await deleteLocalAvatar(
      prev.rows[0]?.avatar_url == null ? null : String(prev.rows[0].avatar_url),
    );
    await db.execute({
      sql: "update users set avatar_url = ? where id = ?",
      args: [avatarUrl, auth.user.id],
    });

    const updated = await db.execute({
      sql: `select ${USER_PUBLIC_COLUMNS} from users where id = ?`,
      args: [auth.user.id],
    });
    const user = mapUserRow(updated.rows[0] as Record<string, unknown>);
    return NextResponse.json({ user: toSessionUser(user) });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Не удалось загрузить файл", 400);
  }
}
