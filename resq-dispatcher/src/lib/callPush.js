import { supabase } from "./supabase";

// Companion to resq-partido/supabase/pending_calls_schema.sql and
// resq-partido/supabase/functions/send-call-push/index.ts on the citizen
// app's side. Called once per outbound call, right after the SDP offer is
// created in CallContext.jsx's startCall().
//
// Both halves of this are best-effort: if either fails, the call still goes
// through exactly as it did before this feature existed — a citizen who
// currently has the app open in the foreground still gets the Realtime
// broadcast + in-app ringing regardless. This only adds reach for a
// closed/backgrounded citizen app; it should never be able to block or
// break a live call.
export async function notifyCitizenOfIncomingCall({ citizenId, dispatcherName, incidentType, sdp }) {
  try {
    await supabase.from("pending_calls").insert({
      citizen_id: citizenId,
      dispatcher_name: dispatcherName,
      incident_type: incidentType,
      sdp,
      status: "ringing",
    });
  } catch {
    // Best-effort — see comment above.
  }

  try {
    await supabase.functions.invoke("send-call-push", {
      body: { citizenId, dispatcherName, incidentType },
    });
  } catch {
    // Best-effort — see comment above.
  }
}

// Called from endCall() when the dispatcher hangs up before the citizen
// answers, so a citizen who opens the app moments later doesn't see a ring
// for a call that's already over.
export async function cancelPendingCall(citizenId) {
  try {
    await supabase.from("pending_calls").update({ status: "cancelled" }).eq("citizen_id", citizenId).eq("status", "ringing");
  } catch {
    // Best-effort.
  }
}
