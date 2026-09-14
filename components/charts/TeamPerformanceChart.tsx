"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function TeamPerformanceChart({
  data,
}: {
  data: { userId: string; userName: string; won: number; total: number }[];
}) {
  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-semibold">Сотрудники</h3>
      <div className="h-64">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted">Нет данных</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid stroke="#e4d9c8" strokeDasharray="3 3" />
              <XAxis dataKey="userName" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" name="Всего" fill="#cbbba8" radius={[6, 6, 0, 0]} />
              <Bar dataKey="won" name="Успешно" fill="#2f6f4e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
