import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { hashPassword } from "../lib/auth";
import { getDb } from "../lib/turso";

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  try {
    const raw = readFileSync(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.local может отсутствовать — тогда берём уже заданные переменные
  }
}

async function main() {
  loadEnvLocal();

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Администратор";

  if (!email || !password) {
    console.error("Задайте ADMIN_EMAIL и ADMIN_PASSWORD в .env.local");
    process.exit(1);
  }

  const db = await getDb();
  const existing = await db.execute({
    sql: "select id from users where email = ?",
    args: [email],
  });

  if (existing.rows.length > 0) {
    await db.execute({
      sql: "update users set role = 'admin', is_active = 1 where email = ?",
      args: [email],
    });
    console.log(`Админ уже существует, роль восстановлена: ${email}`);
    return;
  }

  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  const createdAt = new Date().toISOString();

  await db.execute({
    sql: `insert into users (id, name, email, password_hash, role, is_active, created_at)
          values (?, ?, ?, ?, 'admin', 1, ?)`,
    args: [id, name, email, passwordHash, createdAt],
  });

  console.log(`Создан администратор ${email} (${id})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
