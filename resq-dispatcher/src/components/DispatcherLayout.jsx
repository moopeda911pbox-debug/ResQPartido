import React, { useEffect, useState, useCallback } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import CallPanel from "./CallPanel";
import CitizenCallDock from "./CitizenCallDock";
import { useAuth } from "../context/AuthContext";
import { CallProvider } from "../context/CallContext";
import { getAllIncidents, subscribeToIncidents } from "../services/incidents";
import { notifyNewSOS } from "../lib/alerts";

const TITLES = {
  "/": "Dispatcher's Dashboard",
  "/alerts": "Manage Alerts",
  "/reports": "Manage Reports",
  "/analytics": "Analytics and Report",
  "/admin/accounts": "Manage Accounts",
  "/settings": "Setting",
};

export default function DispatcherLayout() {
  const { profile } = useAuth();
  const location = useLocation();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isAdmin = profile?.role === "admin";

  const refresh = useCallback(async () => {
    try {
      const data = await getAllIncidents();
      setIncidents(data);
      setError("");
    } catch (err) {
      setError(err.message || "Couldn't load reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Admin accounts only ever see Manage Accounts and Settings, neither of
    // which needs incident data — skip the fetch and the Realtime channel.
    if (isAdmin) {
      setLoading(false);
      return;
    }
    refresh();
    const unsubscribe = subscribeToIncidents((payload) => {
      refresh();
      if (payload?.eventType === "INSERT") {
        const inc = payload.new;
        if (inc?.status === "pending" && typeof inc.incident_type === "string" && inc.incident_type.startsWith("SOS:")) {
          notifyNewSOS(inc);
        }
      }
    });
    return unsubscribe;
  }, [refresh, isAdmin]);

  const pendingCount = incidents.filter((i) => i.status === "pending").length;
  const title = TITLES[location.pathname] ?? "ResQPartido";

  return (
    <CallProvider>
    <div className="app-layout">
      <CallPanel />
      <CitizenCallDock />
      <Sidebar pendingCount={pendingCount} />
      <div className="main-panel">
        <div className="main-topbar">
          <h1>{title}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {!isAdmin && (
              <span style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>
                <span className="live-dot" />Live — synced with citizen app
              </span>
            )}
            <div className="who">
              <strong>
                {profile?.first_name ? `${profile.first_name} ${profile.last_name ?? ""}` : isAdmin ? "Admin" : "Dispatcher"}
              </strong>
              {isAdmin
                ? "Admin"
                : `${profile?.agency ? `${profile.agency} · ` : ""}${profile?.municipality ?? "Goa, Camarines Sur"}`}
            </div>
          </div>
        </div>
        <div className="main-content">
          {error && <p className="error-text">{error}</p>}
          <Outlet context={{ incidents, loading, refresh }} />
        </div>
      </div>
    </div>
    </CallProvider>
  );
}
