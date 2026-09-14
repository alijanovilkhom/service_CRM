import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/turso";
import { requireUser } from "@/lib/api";
import { LEAD_SOURCES, LEAD_STATUSES } from "@/lib/constants";
import type { AnalyticsResponse, LeadSource, LeadStatus } from "@/types/crm.types";

function fillDates(from: Date, to: Date, rows: { date: string; count: number }[]) {
  const map = new Map(rows.map((r) => [r.date, r.count]));
  const result: { date: string; count: number }[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    result.push({ date: key, count: map.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const days = Number(request.nextUrl.searchParams.get("days") ?? "30");
  const windowDays = [7, 30, 90].includes(days) ? days : 30;

  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (windowDays - 1));
  from.setHours(0, 0, 0, 0);
  const fromIso = from.toISOString();

  const db = await getDb();
  const isManager = auth.user.role !== "admin";
  const assignedFilter = isManager ? " and assigned_to = ?" : "";
  const assignedArgs = isManager ? [auth.user.id] : [];

  const [overTime, statuses, sources, totals, closeTime, overdue] = await Promise.all([
    db.execute({
      sql: `select date(created_at) as d, count(*) as n
            from leads
            where created_at >= ?${assignedFilter}
            group by date(created_at)
            order by d`,
      args: [fromIso, ...assignedArgs],
    }),
    db.execute({
      sql: `select status, count(*) as n from leads
            where created_at >= ?${assignedFilter}
            group by status`,
      args: [fromIso, ...assignedArgs],
    }),
    db.execute({
      sql: `select source, count(*) as n from leads
            where created_at >= ?${assignedFilter}
            group by source`,
      args: [fromIso, ...assignedArgs],
    }),
    db.execute({
      sql: `select
              count(*) as total,
              sum(case when status = 'won' then 1 else 0 end) as won,
              sum(case when status = 'lost' then 1 else 0 end) as lost
            from leads
            where created_at >= ?${assignedFilter}`,
      args: [fromIso, ...assignedArgs],
    }),
    db.execute({
      sql: `select avg(julianday(updated_at) - julianday(created_at)) as avg_days
            from leads
            where status in ('won', 'lost') and created_at >= ?${assignedFilter}`,
      args: [fromIso, ...assignedArgs],
    }),
    db.execute({
      sql: `select count(*) as n from tasks
            where status = 'pending'
              and due_date is not null
              and date(due_date) < date('now')
              ${isManager ? "and assigned_to = ?" : ""}`,
      args: isManager ? [auth.user.id] : [],
    }),
  ]);

  const total = Number(totals.rows[0]?.total ?? 0);
  const won = Number(totals.rows[0]?.won ?? 0);
  const lost = Number(totals.rows[0]?.lost ?? 0);
  const closed = won + lost;
  const conversionRate = closed === 0 ? 0 : Math.round((won / closed) * 1000) / 10;
  const avgClose = closeTime.rows[0]?.avg_days;
  const avgCloseTimeDays =
    avgClose == null ? null : Math.round(Number(avgClose) * 10) / 10;

  const statusMap = new Map(
    statuses.rows.map((r) => [String(r.status), Number(r.n)]),
  );
  const sourceMap = new Map(
    sources.rows.map((r) => [String(r.source), Number(r.n)]),
  );

  const payload: AnalyticsResponse = {
    totalLeads: total,
    conversionRate,
    avgCloseTimeDays,
    overdueTasks: Number(overdue.rows[0]?.n ?? 0),
    leadsOverTime: fillDates(
      from,
      to,
      overTime.rows.map((r) => ({ date: String(r.d), count: Number(r.n) })),
    ),
    statusBreakdown: LEAD_STATUSES.map((s) => ({
      status: s.id as LeadStatus,
      count: statusMap.get(s.id) ?? 0,
    })),
    sourceBreakdown: LEAD_SOURCES.map((s) => ({
      source: s.id as LeadSource,
      count: sourceMap.get(s.id) ?? 0,
    })),
  };

  if (auth.user.role === "admin") {
    const team = await db.execute({
      sql: `select u.id as userId, u.name as userName,
                   sum(case when l.status = 'won' then 1 else 0 end) as won,
                   count(l.id) as total
            from users u
            left join leads l on l.assigned_to = u.id and l.created_at >= ?
            where u.is_active = 1
            group by u.id, u.name
            order by won desc, total desc`,
      args: [fromIso],
    });
    payload.teamPerformance = team.rows.map((r) => ({
      userId: String(r.userId),
      userName: String(r.userName),
      won: Number(r.won ?? 0),
      total: Number(r.total ?? 0),
    }));
  }

  return NextResponse.json(payload);
}
