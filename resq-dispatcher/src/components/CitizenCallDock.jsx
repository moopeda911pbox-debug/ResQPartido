import React, { useEffect, useState } from "react";
import { PhoneIncoming, Phone, PhoneOff, Mic, MicOff, X } from "lucide-react";
import { useCall } from "../context/CallContext";
import { useAddress } from "../lib/geocode";

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

function locationLabel(call, resolved) {
  if (call.municipality) return call.municipality;
  if (resolved) return resolved;
  if (call.location?.lat != null && call.location?.lng != null) {
    return `${call.location.lat.toFixed(5)}, ${call.location.lng.toFixed(5)}`;
  }
  return "Location unavailable";
}

// The top-of-screen "ringing" banner for whichever citizen call is next in
// line, plus a small overflow count if more than one is waiting.
function RingingBanner({ call, extraCount, onAnswer, onDismiss }) {
  const resolved = useAddress(call.location?.lat, call.location?.lng, null);
  const where = locationLabel(call, resolved);

  return (
    <div style={bannerStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <div style={ringIconStyle}>
          <PhoneIncoming size={18} color="#fff" />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>
            {call.name || "Citizen"} is calling{extraCount > 0 ? ` · +${extraCount} more waiting` : ""}
          </div>
          <div style={{ fontSize: 12, color: "#8a929c", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            📍 {where}
            {call.incidentType ? ` · ${call.incidentType}` : ""}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button style={{ ...iconBtn, background: "#eef1f5" }} onClick={() => onDismiss(call.callId)} title="Dismiss (another dispatcher can still answer)">
          <X size={18} />
        </button>
        <button style={{ ...iconBtn, background: "#20c96b" }} onClick={() => onAnswer(call)} title="Answer">
          <Phone size={18} color="#fff" />
        </button>
      </div>
    </div>
  );
}

export default function CitizenCallDock() {
  const {
    incomingCitizenCalls,
    citizenCallState,
    activeCitizenCall,
    citizenMuted,
    citizenErrorMsg,
    answerCitizenCall,
    dismissCitizenCall,
    hangUpCitizenCall,
    toggleCitizenMute,
  } = useCall();

  const duration = useCallDuration(citizenCallState === "active");
  const [next, ...rest] = incomingCitizenCalls;

  return (
    <>
      {next && citizenCallState !== "connecting" && citizenCallState !== "active" && (
        <RingingBanner call={next} extraCount={rest.length} onAnswer={answerCitizenCall} onDismiss={dismissCitizenCall} />
      )}

      {(citizenCallState === "connecting" || citizenCallState === "active" || citizenCallState === "ended" || citizenCallState === "failed") &&
        activeCitizenCall && (
          <div style={panelStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={dotStyle} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{activeCitizenCall.name || "Citizen"}</div>
                <div style={{ fontSize: 12, color: "#8a929c" }}>
                  {{ connecting: "Connecting…", active: duration, ended: "Call ended", failed: "Call failed" }[citizenCallState]}
                  {" · via internet, not phone network"}
                </div>
                {citizenErrorMsg && <div style={{ fontSize: 12, color: "#e5372f", marginTop: 2 }}>{citizenErrorMsg}</div>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {(citizenCallState === "connecting" || citizenCallState === "active") && (
                <button style={{ ...iconBtn, background: citizenMuted ? "#eef1f5" : "#fff" }} onClick={toggleCitizenMute} title="Mute">
                  {citizenMuted ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
              )}
              {(citizenCallState === "connecting" || citizenCallState === "active") && (
                <button style={{ ...iconBtn, background: "#fdeaea", color: "#e5372f" }} onClick={hangUpCitizenCall} title="Hang up">
                  <PhoneOff size={18} />
                </button>
              )}
            </div>
          </div>
        )}
    </>
  );
}

const bannerStyle = {
  position: "fixed",
  top: 16,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 600,
  background: "#fff",
  border: "1px solid #e5e8ec",
  borderRadius: 14,
  boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
  padding: "12px 14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 20,
  minWidth: 340,
  maxWidth: "min(560px, calc(100vw - 32px))",
};

const ringIconStyle = {
  width: 34,
  height: 34,
  borderRadius: "50%",
  background: "#ff3b3b",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  animation: "marker-pulse 1.1s ease-in-out infinite",
};

const panelStyle = {
  position: "fixed",
  bottom: 20,
  left: 20,
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
  background: "#ff3b3b",
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
