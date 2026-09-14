"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { statusLabel } from "@/lib/constants";
import type { LeadStatus } from "@/types/crm.types";

const COLORS: Record<LeadStatus, string> = {
  new: "#0ea5e9",
  in_progress: "#f59e0b",
  waiting: "#8b5cf6",
  won: "#059669",
  lost: "#f43f5e",
};

export function StatusBreakdownChart({
  data,
}: {
  data: { status: LeadStatus; count: number }[];
}) {
  const chartData = data
    .filter((d) => d.count > 0)
    .map((d) => ({ name: statusLabel(d.status), value: d.count, status: d.status }));

  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-semibold">Статусы заявок</h3>
      <div className="h-64">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted">Нет данных</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80}>
                {chartData.map((entry) => (
                  <Cell key={entry.status} fill={COLORS[entry.status]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
