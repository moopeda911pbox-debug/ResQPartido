import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { AlertTriangle, FileClock, CheckCircle2, Radio } from "lucide-react";
import StatCard from "../components/StatCard";
import IncidentMap from "../components/IncidentMap";
import IncidentTypesChart from "../components/charts/IncidentTypesChart";
import ReportsOverviewChart from "../components/charts/ReportsOverviewChart";
import { summarize, dailyTrend } from "../services/incidents";
import { useCall } from "../context/CallContext";

export default function Dashboard() {
  const { incidents, loading } = useOutletContext();
  const { incomingCitizenCalls, answerCitizenCall, activeCitizenCall } = useCall();
  const [selectedId, setSelectedId] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Arriving here via "Navigate on map" from a report elsewhere in the app
  // (?navigateTo=<id>) selects that pin so its popup — with the in-app
  // Navigate button — opens right away.
  useEffect(() => {
    const navigateTo = searchParams.get("navigateTo");
    if (!navigateTo || loading) return;
    const match = incidents.find((i) => String(i.id) === navigateTo);
    if (match) setSelectedId(match.id);
    setSearchParams({}, { replace: true });
  }, [searchParams, incidents, loading]); // eslint-disable-line react-hooks/exhaustive-deps
  const { counts, incidentTypeData } = useMemo(() => summarize(incidents), [incidents]);
  const trend = useMemo(() => dailyTrend(incidents, 14), [incidents]);
  const emergencyCalls = useMemo(
    () => incidents.filter((i) => i.status !== "resolved").sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [incidents]
  );

  if (loading) return <p className="empty-state">Loading live reports…</p>;

  return (
    <>
      <div className="stat-grid">
        <StatCard icon={AlertTriangle} label="Emergency Alerts" value={counts.pending + counts.acknowledged} tone="orange" />
        <StatCard icon={FileClock} label="Pending Reports" value={counts.pending} tone="gold" />
        <StatCard icon={CheckCircle2} label="Responded" value={counts.resolved} tone="success" />
        <StatCard icon={Radio} label="Total Reports" value={counts.total} tone="navy" />
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header">
          <h2>Emergency Calls</h2>
          <span className="sub">Tap a pin to see who needs help and where</span>
        </div>
        <IncidentMap
          incidents={emergencyCalls}
          selectedId={selectedId}
          onSelect={setSelectedId}
          incomingCalls={incomingCitizenCalls}
          onAnswerCitizenCall={answerCitizenCall}
          activeCallId={activeCitizenCall?.callId}
        />
        <div className="map-legend">
          <span className="item"><span className="dot" style={{ background: "#ff3b3b" }} /> SOS / Emergency</span>
          <span className="item"><span className="dot" style={{ background: "#f0a93a" }} /> Pending report</span>
          <span className="item"><span className="dot" style={{ background: "#2f7cf6" }} /> Verified</span>
          <span className="item"><span className="dot" style={{ background: "#8b5cf6" }} /> Citizen calling</span>
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-header">
            <h2>Incident Types</h2>
            <span className="sub">All-time, by category</span>
          </div>
          <IncidentTypesChart data={incidentTypeData} />
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Reports Overview</h2>
            <span className="sub">Last 14 days</span>
          </div>
          <ReportsOverviewChart data={trend} />
        </div>
      </div>
    </>
  );
}
