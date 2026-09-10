import React from "react";

const GRADIENTS = {
  orange: "linear-gradient(135deg, #f0763a, #d94a08)",
  navy: "linear-gradient(135deg, #1c3a66, #0a1a33)",
  gold: "linear-gradient(135deg, #d9b464, #b3852f)",
  info: "linear-gradient(135deg, #4d8dff, #2158c9)",
  success: "linear-gradient(135deg, #37d67f, #159a52)",
};

export default function StatCard({ icon: Icon, label, value, tone = "orange", plain = false }) {
  return (
    <div className={`stat-card${plain ? " plain" : ""}`} style={plain ? {} : { background: GRADIENTS[tone] }}>
      <div className="icon-badge">
        <Icon size={16} color={plain ? "var(--navy)" : "#fff"} />
      </div>
      <div className="value">{value}</div>
      <div className="label">{label}</div>
    </div>
  );
}
