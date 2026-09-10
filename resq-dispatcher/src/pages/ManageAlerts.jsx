import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Megaphone, ShieldCheck, Trash2 } from "lucide-react";
import StatCard from "../components/StatCard";
import IncidentMap from "../components/IncidentMap";
import PostAlertModal from "../components/PostAlertModal";
import { STATUS, updateIncidentStatus } from "../services/incidents";
import { getAlerts, setAlertActive, deleteAlert, subscribeToAlerts } from "../services/broadcastAlerts";
import { threatLevelMeta } from "../lib/alertTypes";

export default function ManageAlerts() {
  const { incidents, loading, refresh } = useOutletContext();
  const [selectedId, setSelectedId] = useState(null);
  const [acting, setActing] = useState(null);
  const [posted, setPosted] = useState([]);
  const [postedLoading, setPostedLoading] = useState(true);
  const [showPostModal, setShowPostModal] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  const refreshPosted = useCallback(async () => {
    try {
      const data = await getAlerts();
      setPosted(data);
    } catch {
      // Non-fatal — the incident feed above still works either way.
    } finally {
      setPostedLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPosted();
    const unsubscribe = subscribeToAlerts(refreshPosted);
    return unsubscribe;
  }, [refreshPosted]);

  async function toggleActive(id, isActive) {
    setTogglingId(id);
    try {
      await setAlertActive(id, isActive);
      await refreshPosted();
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(alert) {
    setDeletingId(alert.id);
    setDeleteError("");
    try {
      await deleteAlert(alert);
      setConfirmDeleteId(null);
      await refreshPosted();
    } catch (err) {
      setDeleteError(err.message || "Couldn't delete this alert. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  const active = useMemo(
    () => incidents.filter((i) => i.status !== "resolved").sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [incidents]
  );
  const pendingCount = incidents.filter((i) => i.status === "pending").length;
  const verifiedCount = incidents.filter((i) => i.status === "acknowledged").length;
  const resolvedToday = incidents.filter(
    (i) => i.status === "resolved" && (i.responded_at || i.created_at)?.slice(0, 10) === new Date().toISOString().slice(0, 10)
  ).length;

  async function act(id, status) {
    setActing(id);
    try {
      await updateIncidentStatus(id, status);
      await refresh();
    } finally {
      setActing(null);
    }
  }

  if (loading) return <p className="empty-state">Loading live reports…</p>;

  return (
    <>
      <div className="stat-grid">
        <StatCard icon={AlertTriangle} label="Active Alerts" value={pendingCount} tone="orange" />
        <StatCard icon={ShieldCheck} label="Verified, In Progress" value={verifiedCount} tone="info" />
        <StatCard icon={CheckCircle2} label="Resolved Today" value={resolvedToday} tone="success" />
      </div>

      <div className="two-col" style={{ alignItems: "start" }}>
        <div className="panel">
          <div className="panel-header">
            <h2>Live Map</h2>
            <span className="sub">OpenStreetMap · pinned from the citizen app's GPS location</span>
          </div>
          <IncidentMap incidents={active} selectedId={selectedId} onSelect={setSelectedId} />
          <div className="map-legend">
            <span className="item"><span className="dot" style={{ background: "#f0a93a" }} /> Pending</span>
            <span className="item"><span className="dot" style={{ background: "#2f7cf6" }} /> Verified</span>
            <span className="item"><span className="dot" style={{ background: "#20c96b" }} /> Responded</span>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Current Alerts</h2>
            <span className="sub">{active.length} active</span>
          </div>
          <div className="alert-list">
            {active.length === 0 && <div className="empty-state">No active alerts right now.</div>}
            {active.map((inc) => (
              <div
                key={inc.id}
                className={`alert-item${selectedId === inc.id ? " selected" : ""}`}
                onClick={() => setSelectedId(inc.id)}
              >
                <div className="row1">
                  <span className="type">{inc.incident_type}</span>
                  <span className="time">{new Date(inc.created_at).toLocaleString()}</span>
                </div>
                <p className="desc">{inc.description}</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span className={`status-pill ${STATUS[inc.status].className}`}>{STATUS[inc.status].label}</span>
                  <div>
                    {inc.status === "pending" && (
                      <button className="btn-mini primary" disabled={acting === inc.id} onClick={(e) => { e.stopPropagation(); act(inc.id, "acknowledged"); }}>
                        Verify
                      </button>
                    )}
                    {inc.status !== "resolved" && (
                      <button className="btn-mini success" disabled={acting === inc.id} onClick={(e) => { e.stopPropagation(); act(inc.id, "resolved"); }}>
                        Mark Responded
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Broadcast Alerts</h2>
          <span className="sub">Push a warning or advisory straight to every citizen's app</span>
        </div>
        <button className="btn-primary" style={{ width: "auto", padding: "10px 20px", display: "inline-flex", alignItems: "center", gap: 8 }} onClick={() => setShowPostModal(true)}>
          <Megaphone size={16} /> Post Alert
        </button>

        <div className="alert-list" style={{ marginTop: 16 }}>
          {postedLoading && <div className="empty-state">Loading posted alerts…</div>}
          {!postedLoading && posted.length === 0 && (
            <div className="empty-state">No alerts posted yet. Use "Post Alert" to notify citizens.</div>
          )}
          {posted.map((a) => {
            const threat = threatLevelMeta(a.threat_level);
            const media = a.emergency_alert_media ?? [];
            return (
              <div key={a.id} className="alert-item" style={{ cursor: "default", opacity: a.is_active ? 1 : 0.55 }}>
                <div className="row1">
                  <span className="type">{a.title}</span>
                  <span className="time">{new Date(a.created_at).toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className="threat-badge" style={{ background: `${threat.color}22`, color: threat.color }}>
                    {threat.label} threat
                  </span>
                  <span className="threat-badge" style={{ background: "#eef1f5", color: "var(--navy)" }}>{a.alert_type}</span>
                  {(a.municipality || a.address) && (
                    <span className="threat-badge" style={{ background: "#eef1f5", color: "var(--navy)" }}>
                      {[a.municipality, a.address].filter(Boolean).join(" · ")}
                    </span>
                  )}
                  {media.length > 0 && (
                    <span className="threat-badge" style={{ background: "#eef1f5", color: "var(--navy)" }}>
                      {media.length} attachment{media.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <p className="desc" style={{ WebkitLineClamp: "unset" }}>{a.description}</p>

                {deleteError && confirmDeleteId === a.id && <p className="error-text" style={{ margin: "0 0 8px" }}>{deleteError}</p>}

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span className={`status-pill ${a.is_active ? "acknowledged" : "resolved"}`}>
                    {a.is_active ? "Active" : "Expired"}
                  </span>

                  {confirmDeleteId === a.id ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, color: "#8a929c" }}>Delete this alert?</span>
                      <button
                        className="btn-mini"
                        style={{ background: "#ffe3e3", color: "#d92b2b", borderColor: "#ffcccc" }}
                        disabled={deletingId === a.id}
                        onClick={() => handleDelete(a)}
                      >
                        {deletingId === a.id ? "Deleting…" : "Yes, delete"}
                      </button>
                      <button className="btn-mini" disabled={deletingId === a.id} onClick={() => setConfirmDeleteId(null)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button
                        className="btn-mini"
                        disabled={togglingId === a.id}
                        onClick={() => toggleActive(a.id, !a.is_active)}
                      >
                        {a.is_active ? "Mark Expired" : "Reactivate"}
                      </button>
                      <button
                        className="btn-mini"
                        aria-label="Delete alert"
                        title="Delete alert"
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#d92b2b" }}
                        onClick={() => { setDeleteError(""); setConfirmDeleteId(a.id); }}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showPostModal && (
        <PostAlertModal onClose={() => setShowPostModal(false)} onPosted={refreshPosted} />
      )}
    </>
  );
}
