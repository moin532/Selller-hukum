"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { getChartTheme } from "./chartTheme";
import { ChartEmptyState } from "./ChartCard";

export function HorizontalRankingChart({ data = [], nameKey = "name", valueKey = "count", height = 280 }) {
  const theme = getChartTheme();
  const rows = [...(data || [])].sort((a, b) => Number(b[valueKey]) - Number(a[valueKey]));
  if (!rows.length) return <ChartEmptyState title="No category data" />;

  return (
    <div style={{ width: "100%", height: Math.max(height, rows.length * 28) }}>
      <ResponsiveContainer>
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fill: theme.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey={nameKey} width={110} tick={{ fill: theme.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              color: theme.text,
              fontSize: 12,
            }}
          />
          <Bar dataKey={valueKey} fill={theme.gold} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
