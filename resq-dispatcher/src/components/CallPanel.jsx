import React, { useEffect, useState } from "react";
import { Phone, PhoneOff, Mic, MicOff } from "lucide-react";
import { useCall } from "../context/CallContext";

function useCallDuration(active) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) {
      setSeconds(0);
      return;
    }
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function CallPanel() {
  const { callState, callee, muted, errorMsg, hangUp, toggleMute } = useCall();
  const duration = useCallDuration(callState === "active");

  if (callState === "idle" || !callee) return null;

  const statusLabel = { calling: "Calling…", active: duration, ended: "Call ended", rejected: "Call declined", failed: "Call failed" }[
    callState
  ];

  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={dotStyle} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{callee.name}</div>
          <div style={{ fontSize: 12, color: "#8a929c" }}>
            {statusLabel} · via internet, not phone network
          </div>
          {errorMsg && <div style={{ fontSize: 12, color: "#e5372f", marginTop: 2 }}>{errorMsg}</div>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        {(callState === "calling" || callState === "active") && (
          <button style={{ ...iconBtn, background: muted ? "#eef1f5" : "#fff" }} onClick={toggleMute} title="Mute">
            {muted ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        )}
        {(callState === "calling" || callState === "active") && (
          <button style={{ ...iconBtn, background: "#fdeaea", color: "#e5372f" }} onClick={hangUp} title="Hang up">
            <PhoneOff size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

const panelStyle = {
  position: "fixed",
  bottom: 20,
  right: 20,
  zIndex: 500,
  background: "#fff",
  border: "1px solid #e5e8ec",
  borderRadius: 14,
  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
  padding: "14px 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 20,
  minWidth: 300,
};

const dotStyle = {
  width: 10,
  height: 10,
  borderRadius: "50%",
  background: "#20c96b",
  flexShrink: 0,
};

const iconBtn = {
  width: 36,
  height: 36,
  borderRadius: "50%",
  border: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};
