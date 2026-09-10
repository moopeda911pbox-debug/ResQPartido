import React, { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import IncidentTypesChart from "../components/charts/IncidentTypesChart";
import ReportsOverviewChart from "../components/charts/ReportsOverviewChart";
import StatusPieChart from "../components/charts/StatusPieChart";
import ExportMenu from "../components/ExportMenu";
import { summarize, dailyTrend } from "../services/incidents";
import { exportAnalyticsToPDF, exportAnalyticsToExcel } from "../lib/exportReports";

const RANGES = [
  { key: 7, label: "7 days" },
  { key: 14, label: "14 days" },
  { key: 30, label: "30 days" },
];

export default function AnalyticsReport() {
  const { incidents, loading } = useOutletContext();
  const [range, setRange] = useState(14);
  const { counts, incidentTypeData } = useMemo(() => summarize(incidents), [incidents]);
  const trend = useMemo(() => dailyTrend(incidents, range), [incidents, range]);

  const municipalityData = useMemo(() => {
    const byMunicipality = {};
    for (const inc of incidents) {
      const m = inc.profiles?.municipality || "Unspecified";
      byMunicipality[m] = (byMunicipality[m] ?? 0) + 1;
    }
    return Object.entries(byMunicipality)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, [incidents]);

  if (loading) return <p className="empty-state">Loading live reports…</p>;

  const resolutionRate = counts.total ? Math.round((counts.resolved / counts.total) * 100) : 0;
  const rangeLabel = RANGES.find((r) => r.key === range)?.label;

  function handleExportPdf() {
    exportAnalyticsToPDF(
      { counts, incidentTypeData, trend, municipalityData },
      { rangeLabel, filename: `resqpartido-analytics-${range}d-${new Date().toISOString().slice(0, 10)}.pdf` }
    );
  }

  function handleExportExcel() {
    exportAnalyticsToExcel(
      { counts, incidentTypeData, trend, municipalityData },
      { filename: `resqpartido-analytics-${range}d-${new Date().toISOString().slice(0, 10)}.xlsx` }
    );
  }

  return (
    <>
      <div className="panel">
        <div className="panel-header">
          <h2>Reports Over Time</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="chip-row">
              {RANGES.map((r) => (
                <button key={r.key} className={`chip${range === r.key ? " active" : ""}`} onClick={() => setRange(r.key)}>
                  {r.label}
                </button>
              ))}
            </div>
            <ExportMenu onExportPdf={handleExportPdf} onExportExcel={handleExportExcel} />
          </div>
        </div>
        <ReportsOverviewChart data={trend} />
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-header">
            <h2>Incident Types</h2>
            <span className="sub">{counts.total} total reports</span>
          </div>
          <IncidentTypesChart data={incidentTypeData} />
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Status Breakdown</h2>
            <span className="sub">{resolutionRate}% responded overall</span>
          </div>
          <StatusPieChart counts={counts} />
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Reports by Municipality</h2>
          <span className="sub">Based on reporter's registered municipality</span>
        </div>
        <IncidentTypesChart data={municipalityData} />
      </div>
    </>
  );
}
