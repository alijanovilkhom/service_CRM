"use client";

import { useEffect, useState } from "react";
import { LeadsOverTimeChart } from "@/components/charts/LeadsOverTimeChart";
import { SourceBreakdownChart } from "@/components/charts/SourceBreakdownChart";
import { StatusBreakdownChart } from "@/components/charts/StatusBreakdownChart";
import { TeamPerformanceChart } from "@/components/charts/TeamPerformanceChart";
import { useSession } from "@/components/layout/SessionContext";
import { api } from "@/lib/client";
import type { AnalyticsResponse } from "@/types/crm.types";

export default function DashboardPage() {
  const { user } = useSession();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    api<AnalyticsResponse>(`/api/analytics?days=${days}`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Ошибка загрузки"));
  }, [days]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Здравствуйте, {user.name}</p>
          <p className="text-lg font-medium">Сводка по заявкам</p>
        </div>
        <div className="flex rounded-xl bg-paper-2 p-1 text-sm">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`rounded-lg px-3 py-1.5 ${days === d ? "bg-card shadow-sm" : ""}`}
            >
              {d} дн.
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Заявок за период" value={data ? String(data.totalLeads) : "—"} />
        <Metric label="Конверсия" value={data ? `${data.conversionRate}%` : "—"} hint="успешно / закрытые" />
        <Metric
          label="Среднее время закрытия"
          value={data?.avgCloseTimeDays == null ? "—" : `${data.avgCloseTimeDays} дн.`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <LeadsOverTimeChart data={data?.leadsOverTime ?? []} />
        <StatusBreakdownChart data={data?.statusBreakdown ?? []} />
        <SourceBreakdownChart data={data?.sourceBreakdown ?? []} />
        {user.role === "admin" && (
          <TeamPerformanceChart data={data?.teamPerformance ?? []} />
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <div className="text-sm text-muted">{label}</div>
      <div className="font-display mt-1 text-3xl">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}
