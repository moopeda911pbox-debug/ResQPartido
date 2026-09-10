import { supabase } from "../lib/supabase";

const BUCKET = "alert-media";

// Same hardening as the citizen app's incidentFile upload: never trust a
// raw filename extension straight into the storage path.
const ALLOWED_EXTENSIONS = {
  photo: ["jpg", "jpeg", "png", "webp", "heic", "heif"],
  video: ["mp4", "mov", "webm", "m4v"],
};

function safeExtension(fileName, kind) {
  const raw = (fileName.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const allowed = ALLOWED_EXTENSIONS[kind] || [];
  if (allowed.includes(raw)) return raw;
  return kind === "video" ? "mp4" : "jpg";
}

async function uploadAlertFile(dispatcherId, alertId, file, kind = "photo") {
  const ext = safeExtension(file.name, kind);
  const path = `${dispatcherId}/${alertId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// getPublicUrl() always returns `${SUPABASE_URL}/storage/v1/object/public/<bucket>/<path>`,
// so we can recover the storage path from a saved public URL to clean up
// files when an alert is deleted.
function storagePathFromPublicUrl(url) {
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  return idx === -1 ? null : url.slice(idx + marker.length);
}

/**
 * Posts a new broadcast alert notification for citizens to see.
 *
 * alert: {
 *   title, description, alertType, threatLevel,
 *   municipality?, address?, latitude?, longitude?,
 *   photoFile?, videoFile?
 * }
 */
export async function postAlert(dispatcherId, alert) {
  const { data: row, error } = await supabase
    .from("emergency_alerts")
    .insert({
      dispatcher_id: dispatcherId,
      title: alert.title,
      description: alert.description,
      alert_type: alert.alertType,
      threat_level: alert.threatLevel,
      municipality: alert.municipality || null,
      address: alert.address || null,
      latitude: alert.latitude ?? null,
      longitude: alert.longitude ?? null,
    })
    .select()
    .single();

  if (error) throw error;

  const mediaRows = [];
  if (alert.photoFile) {
    const url = await uploadAlertFile(dispatcherId, row.id, alert.photoFile, "photo");
    mediaRows.push({ alert_id: row.id, file_url: url, file_type: "photo" });
  }
  if (alert.videoFile) {
    const url = await uploadAlertFile(dispatcherId, row.id, alert.videoFile, "video");
    mediaRows.push({ alert_id: row.id, file_url: url, file_type: "video" });
  }

  if (mediaRows.length) {
    const { error: mediaError } = await supabase.from("emergency_alert_media").insert(mediaRows);
    if (mediaError) throw mediaError;
  }

  return row;
}

export async function getAlerts() {
  const { data, error } = await supabase
    .from("emergency_alerts")
    .select("*, emergency_alert_media(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// Toggle an alert's visibility to citizens without deleting its history.
export async function setAlertActive(id, isActive) {
  const { data, error } = await supabase
    .from("emergency_alerts")
    .update({ is_active: isActive })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Permanently removes an alert a dispatcher posted (RLS restricts this to
// dispatcher/admin accounts — see "emergency_alerts: dispatcher delete" in
// emergency_alerts_schema.sql). emergency_alert_media rows cascade-delete
// automatically via the foreign key; we also best-effort clean up the
// actual files in storage so they don't pile up.
export async function deleteAlert(alert) {
  const mediaPaths = (alert.emergency_alert_media || [])
    .map((m) => storagePathFromPublicUrl(m.file_url))
    .filter(Boolean);

  if (mediaPaths.length) {
    // Don't let a storage hiccup block deleting the alert itself.
    await supabase.storage.from(BUCKET).remove(mediaPaths).catch(() => {});
  }

  const { error } = await supabase.from("emergency_alerts").delete().eq("id", alert.id);
  if (error) throw error;
}

export function subscribeToAlerts(callback) {
  const channel = supabase
    .channel("dispatcher-emergency-alerts")
    .on("postgres_changes", { event: "*", schema: "public", table: "emergency_alerts" }, callback)
    .subscribe();
  return () => supabase.removeChannel(channel);
}
