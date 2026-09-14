import { getDb } from "@/lib/turso";

export type WebsiteLeadInput = {
  name: string;
  contact: string;
  message?: string;
  city?: string;
  goal?: string;
};

function splitContact(contact: string): { phone: string; email: string | null } {
  const value = contact.trim();
  if (value.includes("@")) {
    return { phone: value, email: value.toLowerCase() };
  }
  return { phone: value || "—", email: null };
}

function buildNotes(input: WebsiteLeadInput): string | null {
  const lines: string[] = [];
  if (input.goal) lines.push(`Цель: ${input.goal}`);
  if (input.city) lines.push(`Город: ${input.city}`);
  if (input.message?.trim()) {
    if (lines.length) lines.push("");
    lines.push(input.message.trim());
  }
  return lines.join("\n") || null;
}

export async function createLeadFromWebsite(input: WebsiteLeadInput): Promise<{
  clientId: string;
  leadId: string;
}> {
  const name = input.name.trim() || "Клиент с сайта";
  const contact = input.contact.trim();
  if (!contact && !name) {
    throw new Error("Нужны имя или контакт");
  }

  const { phone, email } = splitContact(contact || name);
  const db = await getDb();

  let clientId: string | null = null;
  if (email) {
    const byEmail = await db.execute({
      sql: "select id from clients where lower(email) = lower(?) limit 1",
      args: [email],
    });
    if (byEmail.rows[0]) clientId = String(byEmail.rows[0].id);
  }
  if (!clientId && phone && phone !== "—") {
    const byPhone = await db.execute({
      sql: "select id from clients where phone = ? limit 1",
      args: [phone],
    });
    if (byPhone.rows[0]) clientId = String(byPhone.rows[0].id);
  }

  const now = new Date().toISOString();
  if (!clientId) {
    clientId = crypto.randomUUID();
    await db.execute({
      sql: `insert into clients (id, name, phone, email, notes, created_at)
            values (?, ?, ?, ?, ?, ?)`,
      args: [clientId, name, phone, email, "Источник: форма сайта", now],
    });
  }

  const notes = buildNotes(input);
  const leadId = crypto.randomUUID();
  await db.execute({
    sql: `insert into leads (id, client_id, source, status, assigned_to, value, notes, created_at, updated_at)
          values (?, ?, 'website_form', 'new', null, null, ?, ?, ?)`,
    args: [leadId, clientId, notes || null, now, now],
  });

  return { clientId, leadId };
}
