import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/constants";
import { verifyToken } from "@/lib/auth";
import { getDb } from "@/lib/turso";
import { mapUserRow, toSessionUser, USER_PUBLIC_COLUMNS } from "@/lib/users";
import type { SessionUser } from "@/types/crm.types";

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const payload = await verifyToken(token);
    const db = await getDb();
    const result = await db.execute({
      sql: `select ${USER_PUBLIC_COLUMNS} from users where id = ?`,
      args: [payload.userId],
    });
    const row = result.rows[0];
    if (!row) return null;

    const isActive = Number(row.is_active) === 1;
    if (!isActive) return null;

    return toSessionUser(mapUserRow(row as Record<string, unknown>));
  } catch {
    return null;
  }
}

export async function getOverdueTaskCount(userId: string, role: string): Promise<number> {
  const db = await getDb();
  const result =
    role === "admin"
      ? await db.execute(
          `select count(*) as n from tasks
           where status = 'pending'
             and due_date is not null
             and date(due_date) < date('now')`,
        )
      : await db.execute({
          sql: `select count(*) as n from tasks
                where assigned_to = ?
                  and status = 'pending'
                  and due_date is not null
                  and date(due_date) < date('now')`,
          args: [userId],
        });
  return Number(result.rows[0]?.n ?? 0);
}
