import path from "node:path";
import { createClient, type Client } from "@libsql/client";

function resolveDbUrl(): string {
  const url = process.env.TURSO_DATABASE_URL ?? "file:crm.db";
  if (url.startsWith("file:") && !url.startsWith("file:///")) {
    const rel = url.slice("file:".length);
    const abs = path.resolve(/* turbopackIgnore: true */ process.cwd(), rel);
    return `file:///${abs.replace(/\\/g, "/")}`;
  }
  return url;
}

let client: Client | null = null;

export function getTurso(): Client {
  if (!client) {
    const url = resolveDbUrl();
    const authToken = process.env.TURSO_AUTH_TOKEN;
    client = createClient({
      url,
      authToken: authToken ? authToken : undefined,
    });
  }
  return client;
}

const SCHEMA_SQL = `
create table if not exists users (
  id text primary key,
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'manager',
  is_active integer not null default 1,
  avatar_url text,
  created_at text not null
);

create table if not exists clients (
  id text primary key,
  name text not null,
  phone text not null,
  email text,
  notes text,
  created_at text not null
);

create table if not exists leads (
  id text primary key,
  client_id text not null references clients(id),
  source text not null default 'manual',
  status text not null default 'new',
  assigned_to text references users(id),
  value real,
  notes text,
  created_at text not null,
  updated_at text not null
);

create table if not exists tasks (
  id text primary key,
  lead_id text references leads(id),
  client_id text references clients(id),
  assigned_to text not null references users(id),
  title text not null,
  due_date text,
  status text not null default 'pending',
  created_at text not null
);

create index if not exists idx_leads_assigned on leads(assigned_to);
create index if not exists idx_leads_client on leads(client_id);
create index if not exists idx_leads_status on leads(status);
create index if not exists idx_leads_created on leads(created_at);
create index if not exists idx_tasks_assigned on tasks(assigned_to);
create index if not exists idx_tasks_lead on tasks(lead_id);
create index if not exists idx_clients_phone on clients(phone);
`;

const MIGRATIONS = ["alter table users add column avatar_url text"];

let schemaPromise: Promise<void> | null = null;

export async function ensureSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const db = getTurso();
      const statements = SCHEMA_SQL.split(";")
        .map((s) => s.trim())
        .filter(Boolean);
      for (const sql of statements) {
        await db.execute(sql);
      }
      for (const sql of MIGRATIONS) {
        try {
          await db.execute(sql);
        } catch {
          // колонка уже есть
        }
      }
    })();
  }
  await schemaPromise;
}

export async function getDb(): Promise<Client> {
  await ensureSchema();
  return getTurso();
}
