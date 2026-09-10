// Local alert preferences for the dispatcher console (per-browser, not per-account).
const SOUND_KEY = "dispatcher_pref_sound";
const DESKTOP_KEY = "dispatcher_pref_desktop_notif";

export function getSoundPref() {
  return localStorage.getItem(SOUND_KEY) !== "false"; // default on
}
export function setSoundPref(value) {
  localStorage.setItem(SOUND_KEY, String(value));
}

export function getDesktopPref() {
  return localStorage.getItem(DESKTOP_KEY) === "true"; // default off (needs permission)
}
export function setDesktopPref(value) {
  localStorage.setItem(DESKTOP_KEY, String(value));
}

export async function requestDesktopPermission() {
  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

function playAlertBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.16, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.stop(ctx.currentTime + 0.42);
  } catch {
    // Web Audio unavailable in this browser — fail silently.
  }
}

// Looping "ring-ring… ring-ring…" tone for an incoming citizen call — like
// playAlertBeep above but sustained, since a call needs to keep ringing
// until a dispatcher answers (or it's dismissed), not just chime once.
// Returns a controller with stop(); safe to call stop() more than once.
export function startCitizenRingtone() {
  if (!getSoundPref()) return { stop() {} };

  let stopped = false;
  let ctx;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch {
    return { stop() {} }; // Web Audio unavailable — fail silently, banner/marker still show visually.
  }

  function ringPair() {
    if (stopped || ctx.state === "closed") return;
    const now = ctx.currentTime;
    [0, 0.45].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1000, now + offset);
      gain.gain.setValueAtTime(0, now + offset);
      gain.gain.linearRampToValueAtTime(0.15, now + offset + 0.03);
      gain.gain.setValueAtTime(0.15, now + offset + 0.32);
      gain.gain.linearRampToValueAtTime(0, now + offset + 0.38);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.4);
    });
  }

  ringPair();
  const intervalId = setInterval(ringPair, 1800);

  return {
    stop() {
      if (stopped) return;
      stopped = true;
      clearInterval(intervalId);
      ctx.close().catch(() => {});
    },
  };
}

// Call when a new incident row comes in over Realtime. Only makes noise for
// pending SOS reports (incident_type starting with "SOS:"), respecting the
// person's Settings preferences.
export function notifyNewSOS(incident) {
  if (getSoundPref()) playAlertBeep();

  if (getDesktopPref() && typeof Notification !== "undefined" && Notification.permission === "granted") {
    const type = (incident.incident_type || "SOS").replace(/^SOS:\s*/, "");
    try {
      new Notification(`🚨 New SOS: ${type}`, {
        body: incident.address || "Open the dashboard to see the reported location.",
      });
    } catch {
      // Notification constructor can throw on some platforms (e.g. service-worker-only contexts).
    }
  }
}
