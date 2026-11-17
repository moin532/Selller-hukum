"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { getChartTheme } from "./chartTheme";
import { ChartEmptyState } from "./ChartCard";

export function BarComparisonChart({ data = [], series = [], stacked = false, height = 280 }) {
  const theme = getChartTheme();
  if (!data.length || !series.length) return <ChartEmptyState />;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: theme.muted, fontSize: 11 }} axisLine={{ stroke: theme.border }} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fill: theme.muted, fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
          <Tooltip
            contentStyle={{
              background: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              color: theme.text,
              fontSize: 12,
            }}
          />
          {series.length > 1 ? <Legend wrapperStyle={{ color: theme.muted, fontSize: 12 }} /> : null}
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label || s.key}
              stackId={stacked ? "a" : undefined}
              fill={s.color || theme.series[i % theme.series.length]}
              radius={stacked ? 0 : [4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
