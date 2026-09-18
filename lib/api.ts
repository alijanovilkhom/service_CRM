import { NextResponse } from "next/server";
import { getJwtSession, getSessionUser } from "@/lib/session";
import type { SessionUser, UserRole } from "@/types/crm.types";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireJwtUser(): Promise<
  | { user: { id: string; role: UserRole }; error?: undefined }
  | { user?: undefined; error: NextResponse }
> {
  const session = await getJwtSession();
  if (!session) {
    return { error: jsonError("Необходима авторизация", 401) };
  }
  return { user: { id: session.userId, role: session.role } };
}

export async function requireUser(): Promise<
  { user: SessionUser; error?: undefined } | { user?: undefined; error: NextResponse }
> {
  const user = await getSessionUser();
  if (!user) {
    return { error: jsonError("Необходима авторизация", 401) };
  }
  return { user };
}

export async function requireAdmin(): Promise<
  { user: SessionUser; error?: undefined } | { user?: undefined; error: NextResponse }
> {
  const result = await requireUser();
  if (result.error) return result;
  if (result.user.role !== "admin") {
    return { error: jsonError("Недостаточно прав", 403) };
  }
  return result;
}
