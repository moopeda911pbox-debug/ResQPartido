import { supabase } from "../lib/supabase";

// Same status values written by the citizen app (resq-partido/src/services/incidents.js):
// pending -> just reported | acknowledged -> dispatcher verified it's real | resolved -> responded to
export const STATUS = {
  pending: { label: "Pending", className: "pending" },
  acknowledged: { label: "Verified", className: "acknowledged" },
  resolved: { label: "Responded", className: "resolved" },
};

export async function getAllIncidents({ status } = {}) {
  let query = supabase
    .from("incidents")
    .select("*, incident_media(*), profiles:user_id(first_name,last_name,municipality,phone)")
    .order("created_at", { ascending: false });
  if (status && status !== "all") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function updateIncidentStatus(id, status) {
  const patch = { status };
  if (status === "acknowledged") patch.verified_at = new Date().toISOString();
  if (status === "resolved") patch.responded_at = new Date().toISOString();
  const { data, error } = await supabase.from("incidents").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

// Fires `callback` on INSERT/UPDATE/DELETE to public.incidents so every
// screen stays in sync the moment a citizen submits or a dispatcher acts.
export function subscribeToIncidents(callback) {
  const channel = supabase
    .channel("dispatcher-incidents")
    .on("postgres_changes", { event: "*", schema: "public", table: "incidents" }, callback)
    .subscribe();
  return () => supabase.removeChannel(channel);
}

export function summarize(incidents) {
  const counts = { pending: 0, acknowledged: 0, resolved: 0, total: incidents.length };
  const byType = {};
  for (const inc of incidents) {
    counts[inc.status] = (counts[inc.status] ?? 0) + 1;
    // Group "SOS: Fire" together with plain "Fire" reports so the chart
    // reflects the underlying emergency type, not how it was filed.
    const type = (inc.incident_type || "").replace(/^SOS:\s*/, "") || "Unspecified";
    byType[type] = (byType[type] ?? 0) + 1;
  }
  const incidentTypeData = Object.entries(byType)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
  return { counts, incidentTypeData };
}

// Daily counts for the last `days` days, split by status — used by the
// Reports Overview / Analytics charts.
export function dailyTrend(incidents, days = 14) {
  const buckets = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets.push({
      date: key,
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      pending: 0,
      acknowledged: 0,
      resolved: 0,
      total: 0,
    });
  }
  const byKey = Object.fromEntries(buckets.map((b) => [b.date, b]));
  for (const inc of incidents) {
    const key = (inc.created_at || "").slice(0, 10);
    const bucket = byKey[key];
    if (!bucket) continue;
    bucket[inc.status] = (bucket[inc.status] ?? 0) + 1;
    bucket.total += 1;
  }
  return buckets;
}
