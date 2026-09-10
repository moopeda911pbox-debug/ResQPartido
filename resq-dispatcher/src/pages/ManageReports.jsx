import React, { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import StatCard from "../components/StatCard";
import IncidentDetailModal from "../components/IncidentDetailModal";
import ExportMenu from "../components/ExportMenu";
import { FileClock, ShieldCheck, CheckCircle2, Paperclip } from "lucide-react";
import { STATUS, updateIncidentStatus } from "../services/incidents";
import { exportIncidentsToPDF, exportIncidentsToExcel } from "../lib/exportReports";

const TABS = [
  { key: "all", label: "All Reports" },
  { key: "pending", label: "Pending" },
  { key: "acknowledged", label: "Verified" },
  { key: "resolved", label: "Responded" },
];

export default function ManageReports() {
  const { incidents, loading, refresh } = useOutletContext();
  const [tab, setTab] = useState("all");
  const [acting, setActing] = useState(null);
  const [viewing, setViewing] = useState(null);

  const counts = useMemo(
    () => ({
      pending: incidents.filter((i) => i.status === "pending").length,
      acknowledged: incidents.filter((i) => i.status === "acknowledged").length,
      resolved: incidents.filter((i) => i.status === "resolved").length,
    }),
    [incidents]
  );

  const filtered = useMemo(
    () =>
      incidents
        .filter((i) => tab === "all" || i.status === tab)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [incidents, tab]
  );

  async function act(id, status) {
    setActing(id);
    try {
      await updateIncidentStatus(id, status);
      await refresh();
    } finally {
      setActing(null);
    }
  }

  const currentTabLabel = TABS.find((t) => t.key === tab)?.label || "All Reports";

  function handleExportPdf() {
    exportIncidentsToPDF(filtered, {
      title: "ResQPartido — Incident Reports",
      subtitle: `${currentTabLabel} · Generated ${new Date().toLocaleString()} · ${filtered.length} reports`,
      filename: `resqpartido-reports-${tab}-${new Date().toISOString().slice(0, 10)}.pdf`,
    });
  }

  function handleExportExcel() {
    exportIncidentsToExcel(filtered, {
      sheetName: currentTabLabel,
      filename: `resqpartido-reports-${tab}-${new Date().toISOString().slice(0, 10)}.xlsx`,
    });
  }

  if (loading) return <p className="empty-state">Loading live reports…</p>;

  return (
    <>
      <div className="stat-grid">
        <StatCard icon={FileClock} label="Pending" value={counts.pending} tone="gold" />
        <StatCard icon={ShieldCheck} label="Verified" value={counts.acknowledged} tone="info" />
        <StatCard icon={CheckCircle2} label="Responded" value={counts.resolved} tone="success" />
      </div>

      <div className="panel">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div className="chip-row">
            {TABS.map((t) => (
              <button key={t.key} className={`chip${tab === t.key ? " active" : ""}`} onClick={() => setTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
          <ExportMenu onExportPdf={handleExportPdf} onExportExcel={handleExportExcel} />
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">No reports in this category yet.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Reported by</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Media</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inc) => (
                  <tr key={inc.id}>
                    <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{inc.incident_type}</td>
                    <td style={{ maxWidth: 320 }}>{inc.description}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {inc.profiles ? `${inc.profiles.first_name ?? ""} ${inc.profiles.last_name ?? ""}`.trim() || "—" : "—"}
                      <div style={{ fontSize: 10.5, color: "var(--muted)" }}>{inc.profiles?.municipality ?? ""}</div>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>{new Date(inc.created_at).toLocaleString()}</td>
                    <td>
                      <span className={`status-pill ${STATUS[inc.status].className}`}>{STATUS[inc.status].label}</span>
                    </td>
                    <td>
                      {(inc.incident_media?.length ?? 0) > 0 ? (
                        <span className="media-badge">
                          <Paperclip size={12} /> {inc.incident_media.length}
                        </span>
                      ) : (
                        <span style={{ color: "var(--muted)", fontSize: 11.5 }}>—</span>
                      )}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="btn-mini" onClick={() => setViewing(inc)} style={{ marginRight: 6 }}>
                        View
                      </button>
                      {inc.status === "pending" && (
                        <button className="btn-mini primary" disabled={acting === inc.id} onClick={() => act(inc.id, "acknowledged")}>
                          Verify
                        </button>
                      )}
                      {inc.status !== "resolved" && (
                        <button className="btn-mini success" disabled={acting === inc.id} onClick={() => act(inc.id, "resolved")}>
                          Mark Responded
                        </button>
                      )}
                      {inc.status === "resolved" && <span style={{ color: "var(--muted)", fontSize: 11.5 }}>Closed</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <IncidentDetailModal incident={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
