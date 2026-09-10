// Minimal WebRTC helper for in-app, data-only voice calls (dispatcher <-> citizen).
// See resq-partido/src/lib/webrtc.js for the citizen-side counterpart.
//
// STUN alone only works when both peers can reach each other directly (same
// LAN, or NATs that happen to cooperate). Once the dispatcher and citizen are
// on separate real-world networks — different ISPs, carrier-grade NAT,
// symmetric NATs, campus/office firewalls — the direct path fails and the
// call needs a TURN relay to fall back to.
//
// This wires in the Open Relay Project's free, no-signup TURN server
// (https://www.metered.ca/tools/openrelay/) using its published static demo
// credentials, so cross-network calls work out of the box for testing. It's
// a shared public server with a bandwidth cap and no uptime guarantee —
// fine for development/testing, but for production traffic sign up for a
// free Metered account (or another provider like Twilio's Network Traversal
// Service) and swap in your own TURN credentials here.
export const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:openrelay.metered.ca:80" },
  { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

export function createPeerConnection({ onIceCandidate, onTrack, onConnectionStateChange }) {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

  pc.onicecandidate = (event) => {
    if (event.candidate) onIceCandidate?.(event.candidate);
  };
  pc.ontrack = (event) => {
    onTrack?.(event.streams[0]);
  };
  pc.onconnectionstatechange = () => {
    onConnectionStateChange?.(pc.connectionState);
  };

  return pc;
}

export async function getMicStream() {
  return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
}
