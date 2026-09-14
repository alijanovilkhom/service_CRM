import { NextRequest, NextResponse } from "next/server";
import { createLeadFromWebsite } from "@/lib/leads";
import { jsonError } from "@/lib/api";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRM_INBOUND_SECRET?.trim();
  if (!secret) return false;
  const header =
    request.headers.get("x-crm-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header === secret;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return jsonError("Недостаточно прав", 401);
  }

  let body: {
    name?: string;
    contact?: string;
    message?: string;
    city?: string;
    goal?: string;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректное тело запроса", 400);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const contact = typeof body.contact === "string" ? body.contact.trim() : "";
  const message = typeof body.message === "string" ? body.message : "";

  if (!name && !contact && !message.trim()) {
    return jsonError("Пустая заявка", 400);
  }

  try {
    const created = await createLeadFromWebsite({
      name,
      contact,
      message,
      city: typeof body.city === "string" ? body.city : undefined,
      goal: typeof body.goal === "string" ? body.goal : undefined,
    });
    return NextResponse.json({ ok: true, ...created }, { status: 201 });
  } catch (err) {
    console.error("Inbound lead failed:", err);
    return jsonError("Не удалось сохранить заявку", 500);
  }
}
