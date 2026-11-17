"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { getChartTheme } from "./chartTheme";
import { ChartEmptyState } from "./ChartCard";

export function DonutBreakdownChart({ data = [], nameKey = "status", valueKey = "count", height = 280 }) {
  const theme = getChartTheme();
  const rows = (data || []).filter((d) => Number(d[valueKey]) > 0);
  if (!rows.length) return <ChartEmptyState title="No status counts" />;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={rows}
            dataKey={valueKey}
            nameKey={nameKey}
            innerRadius="55%"
            outerRadius="78%"
            paddingAngle={2}
            stroke={theme.surface}
          >
            {rows.map((_, i) => (
              <Cell key={i} fill={theme.series[i % theme.series.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [`${value}`, name]}
            contentStyle={{
              background: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              color: theme.text,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ color: theme.muted, fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
