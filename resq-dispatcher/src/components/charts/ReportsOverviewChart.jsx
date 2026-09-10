import React from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

export default function ReportsOverviewChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 4 }}>
        <defs>
          <linearGradient id="gPending" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f0a93a" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#f0a93a" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gAck" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2f7cf6" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#2f7cf6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gResolved" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#20c96b" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#20c96b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10.5, fill: "#8a929c" }} interval="preserveStartEnd" />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#8a929c" }} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e5ea" }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Area type="monotone" dataKey="pending" name="Pending" stroke="#f0a93a" fill="url(#gPending)" strokeWidth={2} />
        <Area type="monotone" dataKey="acknowledged" name="Verified" stroke="#2f7cf6" fill="url(#gAck)" strokeWidth={2} />
        <Area type="monotone" dataKey="resolved" name="Responded" stroke="#20c96b" fill="url(#gResolved)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
