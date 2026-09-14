import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_DAYS } from "@/lib/constants";
import { signToken, verifyPassword } from "@/lib/auth";
import { getDb } from "@/lib/turso";

const GENERIC_ERROR = "неверный email или пароль";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  if (!email || !password) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const db = await getDb();
  const result = await db.execute({
    sql: "select id, role, password_hash, is_active from users where email = ?",
    args: [email],
  });
  const row = result.rows[0];

  if (!row || Number(row.is_active) !== 1) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const ok = await verifyPassword(password, String(row.password_hash));
  if (!ok) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const token = await signToken({
    userId: String(row.id),
    role: row.role === "admin" ? "admin" : "manager",
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return response;
}
