"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { sourceLabel } from "@/lib/constants";
import type { LeadSource } from "@/types/crm.types";

export function SourceBreakdownChart({
  data,
}: {
  data: { source: LeadSource; count: number }[];
}) {
  const chartData = data.map((d) => ({
    name: sourceLabel(d.source),
    count: d.count,
  }));

  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-semibold">Источники</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid stroke="#e4d9c8" strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" name="Заявки" fill="#2c241e" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
