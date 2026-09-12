import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { createPeerConnection, getMicStream } from "../lib/webrtc";
import { startCitizenRingtone } from "../lib/alerts";
import { useAuth } from "./AuthContext";
import { notifyCitizenOfIncomingCall, cancelPendingCall } from "../lib/callPush";

const CallCtx = createContext(null);

// Channel naming must match the citizen app exactly: resq-partido/src/context/CallContext.jsx
const channelName = (userId) => `call-${userId}`;

// --- Citizen-initiated calls ------------------------------------------------
// Any citizen can tap "Call Dispatcher" without knowing which dispatcher will
// pick up, so there's no single userId to address like the outbound flow
// above. Instead:
//   1. The citizen broadcasts on the shared DISPATCHER_INBOX channel, which
//      every signed-in dispatcher subscribes to for as long as the console is
//      open — this is the "ring" that shows up as a map marker + banner.
//   2. Whichever dispatcher answers first joins a call-specific channel
//      (citizenCallChannelName) and broadcasts "claimed" on the shared inbox
//      so it disappears from every other dispatcher's queue.
//   3. The citizen (still listening on that call-specific channel) gets the
//      dispatcher's "dispatcher-ready" and only then creates the SDP offer —
//      the citizen is the caller, so it plays the offerer role, mirroring who
//      actually placed the call.
// Naming must match resq-partido/src/context/CallContext.jsx exactly.
const DISPATCHER_INBOX = "dispatcher-inbox";
const citizenCallChannelName = (callId) => `citizen-call-${callId}`;

// How long an unanswered citizen call stays in the queue before this
// dispatcher's own view drops it — a client-side safety net in case the
// citizen's own "cancelled" broadcast never arrives (tab closed, connection
// dropped, etc). The citizen side gives up and shows "no dispatcher
// available" slightly before this, so in the normal case this never fires.
const RING_TIMEOUT_MS = 45000;

export function CallProvider({ children }) {
  const { profile } = useAuth();

  // --- outbound: dispatcher calls a specific citizen (unchanged) ---
  const [callState, setCallState] = useState("idle"); // idle | calling | active | ended | rejected | failed
  const [callee, setCallee] = useState(null); // { userId, name, incidentType }
  const [muted, setMuted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const channelRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const pendingIceRef = useRef([]); // citizen's ICE candidates that arrive before "answer" has set our remote description

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pendingIceRef.current = [];
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
  }, []);

  const endCall = useCallback(
    (state = "ended", notifyRemote = true) => {
      if (notifyRemote && channelRef.current) {
        channelRef.current.send({ type: "broadcast", event: "hangup", payload: {} });
      }
      if (notifyRemote && callee?.userId) cancelPendingCall(callee.userId);
      cleanup();
      setCallState(state);
      setMuted(false);
      setTimeout(() => setCallState((s) => (s === state ? "idle" : s)), 1800);
    },
    [cleanup, callee]
  );

  const startCall = useCallback(
    async (userId, name, incidentType) => {
      if (!userId) return;
      setErrorMsg("");
      setCallee({ userId, name, incidentType });
      setCallState("calling");

      try {
        const stream = await getMicStream();
        localStreamRef.current = stream;

        const channel = supabase.channel(channelName(userId));
        channelRef.current = channel;

        const pc = createPeerConnection({
          onIceCandidate: (candidate) => {
            channel.send({ type: "broadcast", event: "ice-dispatcher", payload: { candidate } });
          },
          onTrack: (remoteStream) => {
            if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream;
          },
          onConnectionStateChange: (state) => {
            if (state === "connected") setCallState("active");
            if (state === "failed") {
              setErrorMsg("Call connection failed — the citizen's device may have no internet.");
              endCall("failed", false);
            }
          },
        });
        pcRef.current = pc;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        channel
          .on("broadcast", { event: "answer" }, async ({ payload }) => {
            if (!pcRef.current) return;
            await pcRef.current.setRemoteDescription(payload.sdp);
            // Flush any citizen ICE candidates that arrived before we had a
            // remote description to attach them to — see the note below.
            pendingIceRef.current.splice(0).forEach((candidate) => {
              pcRef.current.addIceCandidate(candidate).catch(() => {});
            });
          })
          .on("broadcast", { event: "ice-citizen" }, ({ payload }) => {
            if (!payload.candidate) return;
            // Candidates can arrive interleaved with (or even slightly ahead
            // of) the "answer" broadcast above; queue instead of dropping if
            // our remote description isn't set yet, or the call can end up
            // one-sided and hang at "Connecting…" forever.
            if (pcRef.current && pcRef.current.remoteDescription) {
              pcRef.current.addIceCandidate(payload.candidate).catch(() => {});
            } else {
              pendingIceRef.current.push(payload.candidate);
            }
          })
          .on("broadcast", { event: "reject" }, () => endCall("rejected", false))
          .on("broadcast", { event: "hangup" }, () => endCall("ended", false))
          .subscribe(async (status) => {
            if (status !== "SUBSCRIBED") return;
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            const dispatcherName = profile?.first_name
              ? `${profile.first_name} ${profile.last_name ?? ""}`.trim()
              : "Dispatcher";
            channel.send({
              type: "broadcast",
              event: "offer",
              payload: { sdp: offer, dispatcherName, incidentType },
            });

            // Fire-and-forget: lets a closed/backgrounded citizen app find
            // out about this call too, not just one that's already open and
            // subscribed to the Realtime broadcast above. See
            // pending_calls_schema.sql and the send-call-push edge function
            // for why both of these exist alongside the broadcast.
            notifyCitizenOfIncomingCall({ citizenId: userId, dispatcherName, incidentType, sdp: offer });
          });
      } catch (err) {
        setErrorMsg(
          err?.name === "NotAllowedError" ? "Microphone permission is needed to place the call." : "Couldn't start the call."
        );
        cleanup();
        setCallState("idle");
        setCallee(null);
      }
    },
    [profile, endCall, cleanup]
  );

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !muted;
    stream.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  }, [muted]);

  // --- inbound: a citizen calls in, any dispatcher can answer ---
  const [incomingCitizenCalls, setIncomingCitizenCalls] = useState([]); // [{ callId, citizenId, name, phone, incidentType, location, municipality, receivedAt }]
  const [citizenCallState, setCitizenCallState] = useState("idle"); // idle | connecting | active | ended | failed
  const [activeCitizenCall, setActiveCitizenCall] = useState(null);
  const [citizenMuted, setCitizenMuted] = useState(false);
  const [citizenErrorMsg, setCitizenErrorMsg] = useState("");

  const inboxChannelRef = useRef(null);
  const inboundChannelRef = useRef(null);
  const inboundPcRef = useRef(null);
  const inboundStreamRef = useRef(null);
  const inboundAudioRef = useRef(null);
  const ringToneRef = useRef(null);
  const ringTimeoutsRef = useRef({}); // callId -> timeout id
  const inboundPendingIceRef = useRef([]); // citizen's ICE candidates arriving before setRemoteDescription completes

  const dispatcherDisplayName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name ?? ""}`.trim()
    : "Dispatcher";

  const clearRingTimeout = (callId) => {
    if (ringTimeoutsRef.current[callId]) {
      clearTimeout(ringTimeoutsRef.current[callId]);
      delete ringTimeoutsRef.current[callId];
    }
  };

  const removeIncomingCall = useCallback((callId) => {
    clearRingTimeout(callId);
    setIncomingCitizenCalls((calls) => calls.filter((c) => c.callId !== callId));
  }, []);

  // Join the shared inbox once per mount (i.e. for as long as the dispatcher
  // console is open) so a call can ring in no matter which page is showing.
  useEffect(() => {
    const channel = supabase.channel(DISPATCHER_INBOX);
    inboxChannelRef.current = channel;

    channel
      .on("broadcast", { event: "incoming-citizen-call" }, ({ payload }) => {
        setIncomingCitizenCalls((calls) => {
          if (calls.some((c) => c.callId === payload.callId)) return calls;
          return [...calls, { ...payload, receivedAt: Date.now() }];
        });
        ringTimeoutsRef.current[payload.callId] = setTimeout(
          () => removeIncomingCall(payload.callId),
          RING_TIMEOUT_MS
        );
      })
      .on("broadcast", { event: "cancelled" }, ({ payload }) => {
        removeIncomingCall(payload.callId);
      })
      .on("broadcast", { event: "claimed" }, ({ payload }) => {
        removeIncomingCall(payload.callId);
      })
      .subscribe();

    return () => {
      Object.keys(ringTimeoutsRef.current).forEach(clearTimeout);
      ringTimeoutsRef.current = {};
      supabase.removeChannel(channel);
      inboxChannelRef.current = null;
    };
  }, [removeIncomingCall]);

  // Ring for as long as at least one citizen call is waiting to be answered.
  useEffect(() => {
    if (incomingCitizenCalls.length > 0 && !ringToneRef.current) {
      ringToneRef.current = startCitizenRingtone();
    } else if (incomingCitizenCalls.length === 0 && ringToneRef.current) {
      ringToneRef.current.stop();
      ringToneRef.current = null;
    }
    return () => {
      if (incomingCitizenCalls.length === 0 && ringToneRef.current) {
        ringToneRef.current.stop();
        ringToneRef.current = null;
      }
    };
  }, [incomingCitizenCalls.length]);

  const cleanupInbound = useCallback(() => {
    inboundPcRef.current?.close();
    inboundPcRef.current = null;
    inboundStreamRef.current?.getTracks().forEach((t) => t.stop());
    inboundStreamRef.current = null;
    if (inboundChannelRef.current) {
      supabase.removeChannel(inboundChannelRef.current);
      inboundChannelRef.current = null;
    }
    if (inboundAudioRef.current) inboundAudioRef.current.srcObject = null;
    inboundPendingIceRef.current = [];
  }, []);

  const endCitizenCall = useCallback(
    (state = "ended", notifyRemote = true) => {
      if (notifyRemote && inboundChannelRef.current) {
        inboundChannelRef.current.send({ type: "broadcast", event: "hangup", payload: {} });
      }
      cleanupInbound();
      setCitizenCallState(state);
      setCitizenMuted(false);
      setTimeout(() => {
        setCitizenCallState((s) => (s === state ? "idle" : s));
        setActiveCitizenCall((c) => (c && state !== "idle" ? null : c));
      }, 1800);
    },
    [cleanupInbound]
  );

  // Stop ringing on this device for a call without ending it for anyone else
  // — another dispatcher elsewhere may still pick it up. Purely local.
  const dismissCitizenCall = useCallback(
    (callId) => {
      removeIncomingCall(callId);
    },
    [removeIncomingCall]
  );

  const answerCitizenCall = useCallback(
    async (call) => {
      if (!call?.callId) return;
      if (citizenCallState === "connecting" || citizenCallState === "active") return; // already on a call in this tab

      removeIncomingCall(call.callId);
      setCitizenErrorMsg("");
      setActiveCitizenCall(call);
      setCitizenCallState("connecting");

      // Tell every other dispatcher's queue this one's taken.
      inboxChannelRef.current?.send({
        type: "broadcast",
        event: "claimed",
        payload: { callId: call.callId, dispatcherName: dispatcherDisplayName },
      });

      try {
        const stream = await getMicStream();
        inboundStreamRef.current = stream;

        const channel = supabase.channel(citizenCallChannelName(call.callId));
        inboundChannelRef.current = channel;

        const pc = createPeerConnection({
          onIceCandidate: (candidate) => {
            channel.send({ type: "broadcast", event: "ice-dispatcher", payload: { candidate } });
          },
          onTrack: (remoteStream) => {
            if (inboundAudioRef.current) inboundAudioRef.current.srcObject = remoteStream;
          },
          onConnectionStateChange: (state) => {
            if (state === "connected") setCitizenCallState("active");
            if (state === "failed") {
              setCitizenErrorMsg("Call connection failed — the citizen's device may have no internet.");
              endCitizenCall("failed", false);
            }
          },
        });
        inboundPcRef.current = pc;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        channel
          .on("broadcast", { event: "offer" }, async ({ payload }) => {
            if (!inboundPcRef.current) return;
            await inboundPcRef.current.setRemoteDescription(payload.sdp);
            // Flush any citizen ICE candidates that beat the offer here.
            inboundPendingIceRef.current.splice(0).forEach((candidate) => {
              inboundPcRef.current.addIceCandidate(candidate).catch(() => {});
            });
            const answer = await inboundPcRef.current.createAnswer();
            await inboundPcRef.current.setLocalDescription(answer);
            channel.send({ type: "broadcast", event: "answer", payload: { sdp: answer } });
          })
          .on("broadcast", { event: "ice-citizen" }, ({ payload }) => {
            if (!payload.candidate) return;
            if (inboundPcRef.current && inboundPcRef.current.remoteDescription) {
              inboundPcRef.current.addIceCandidate(payload.candidate).catch(() => {});
            } else {
              inboundPendingIceRef.current.push(payload.candidate);
            }
          })
          .on("broadcast", { event: "hangup" }, () => endCitizenCall("ended", false))
          .subscribe((status) => {
            if (status !== "SUBSCRIBED") return;
            channel.send({
              type: "broadcast",
              event: "dispatcher-ready",
              payload: { dispatcherName: dispatcherDisplayName },
            });
          });
      } catch (err) {
        setCitizenErrorMsg(
          err?.name === "NotAllowedError" ? "Microphone permission is needed to answer the call." : "Couldn't answer the call."
        );
        cleanupInbound();
        setCitizenCallState("idle");
        setActiveCitizenCall(null);
      }
    },
    [citizenCallState, dispatcherDisplayName, removeIncomingCall, endCitizenCall, cleanupInbound]
  );

  const toggleCitizenMute = useCallback(() => {
    const stream = inboundStreamRef.current;
    if (!stream) return;
    const next = !citizenMuted;
    stream.getAudioTracks().forEach((t) => (t.enabled = !next));
    setCitizenMuted(next);
  }, [citizenMuted]);

  return (
    <CallCtx.Provider
      value={{
        callState,
        callee,
        muted,
        errorMsg,
        startCall,
        hangUp: () => endCall("ended", true),
        toggleMute,

        incomingCitizenCalls,
        citizenCallState,
        activeCitizenCall,
        citizenMuted,
        citizenErrorMsg,
        answerCitizenCall,
        dismissCitizenCall,
        hangUpCitizenCall: () => endCitizenCall("ended", true),
        toggleCitizenMute,
      }}
    >
      {children}
      <audio ref={remoteAudioRef} autoPlay />
      <audio ref={inboundAudioRef} autoPlay />
    </CallCtx.Provider>
  );
}

export function useCall() {
  const ctx = useContext(CallCtx);
  if (!ctx) throw new Error("useCall must be used inside CallProvider");
  return ctx;
}
