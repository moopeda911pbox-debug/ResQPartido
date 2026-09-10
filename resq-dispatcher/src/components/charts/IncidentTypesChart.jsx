import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

const COLORS = ["#e0530a", "#0f2545", "#c9a24b", "#2f7cf6", "#20c96b", "#ff3b3b", "#8a929c", "#bf4508"];

export default function IncidentTypesChart({ data }) {
  if (!data.length) {
    return <div className="empty-state">No incident reports yet — this chart fills in as citizens submit reports.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" vertical={false} />
        <XAxis dataKey="type" tick={{ fontSize: 10.5, fill: "#8a929c" }} interval={0} angle={-20} textAnchor="end" height={56} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#8a929c" }} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e5ea" }} />
        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
