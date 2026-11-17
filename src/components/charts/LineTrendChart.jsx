"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { getChartTheme } from "./chartTheme";
import { ChartEmptyState } from "./ChartCard";

export function LineTrendChart({ data = [], series = [], height = 280 }) {
  const theme = getChartTheme();
  if (!data.length || !series.length) return <ChartEmptyState />;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label || s.key}
              stroke={s.color || theme.series[i % theme.series.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
