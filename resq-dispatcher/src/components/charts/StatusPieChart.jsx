import React from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = { Pending: "#f0a93a", Verified: "#2f7cf6", Responded: "#20c96b" };

export default function StatusPieChart({ counts }) {
  const data = [
    { name: "Pending", value: counts.pending ?? 0 },
    { name: "Verified", value: counts.acknowledged ?? 0 },
    { name: "Responded", value: counts.resolved ?? 0 },
  ];
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <div className="empty-state">No reports yet.</div>;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={54} outerRadius={82} paddingAngle={3}>
          {data.map((d, i) => (
            <Cell key={i} fill={COLORS[d.name]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e5ea" }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
