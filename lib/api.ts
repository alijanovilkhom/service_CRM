import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import type { SessionUser } from "@/types/crm.types";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
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
