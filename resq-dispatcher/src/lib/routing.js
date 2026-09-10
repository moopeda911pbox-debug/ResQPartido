// In-app driving directions for the dispatcher map.
//
// Uses OSRM's free public routing API (no key, no billing account) instead
// of deep-linking out to Google Maps. This keeps the dispatcher inside the
// app end-to-end: pick a call/report, hit "Navigate", and a route draws
// straight onto the Leaflet map with a turn-by-turn list alongside it.
//
// OSRM's public demo server (router.project-osrm.org) is meant for
// light/occasional use. If this ever needs to hold up under heavy or
// production dispatcher traffic, swap OSRM_BASE_URL for a self-hosted OSRM
// instance or another routing provider — everything else in this file stays
// the same since it only depends on the OSRM response shape.
const OSRM_BASE_URL = "https://router.project-osrm.org";

function formatDistance(meters) {
  if (meters == null) return "";
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

// OSRM gives structured maneuvers (type/modifier/road name) rather than
// ready-made sentences, so turn them into short human instructions.
function describeStep(step) {
  const m = step.maneuver || {};
  const modifier = m.modifier ? m.modifier.replace(/^slight |^sharp /, "") : "";
  const road = step.name ? ` onto ${step.name}` : "";

  switch (m.type) {
    case "depart":
      return `Head out${road || ""}`;
    case "arrive":
      return "Arrive at destination";
    case "turn":
      return `Turn ${modifier || "onward"}${road}`;
    case "new name":
      return `Continue${road}`;
    case "merge":
      return `Merge${road}`;
    case "on ramp":
      return `Take the ramp${road}`;
    case "off ramp":
      return `Take the exit${road}`;
    case "fork":
      return `Keep ${modifier || "straight"}${road}`;
    case "end of road":
      return `Turn ${modifier || "onward"} at the end of the road${road}`;
    case "roundabout":
    case "rotary":
    case "roundabout turn":
      return `Enter the roundabout${road}`;
    case "continue":
      return `Continue ${modifier || "straight"}${road}`;
    default:
      return `Continue${road}`;
  }
}

// origin/dest: { lat, lng }. Returns:
//   { coordinates: [[lat,lng], ...], distanceKm, durationMin, steps: [{instruction, distanceText}] }
// Throws if no route could be found (caller should catch and show a message).
export async function fetchRoute(origin, dest) {
  const url =
    `${OSRM_BASE_URL}/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}` +
    `?overview=full&geometries=geojson&steps=true`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Routing request failed (${res.status})`);
  const data = await res.json();

  const routeData = data?.routes?.[0];
  if (!routeData) throw new Error("No route found");

  const coordinates = routeData.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

  const steps = (routeData.legs?.[0]?.steps || []).map((s) => ({
    instruction: describeStep(s),
    distanceText: formatDistance(s.distance),
  }));

  return {
    coordinates,
    distanceKm: (routeData.distance / 1000).toFixed(1),
    durationMin: Math.max(1, Math.round(routeData.duration / 60)),
    steps,
  };
}
