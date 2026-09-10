// Kinds of broadcast alert a dispatcher can post. Mirrors the citizen app's
// SOS incident types plus a few that only make sense as dispatcher-issued
// warnings (Typhoon, Evacuation Notice, General Advisory).
export const ALERT_TYPES = [
  "Fire",
  "Flood",
  "Typhoon",
  "Earthquake",
  "Landslide",
  "Vehicular Accident",
  "Medical Emergency",
  "Crime in Progress",
  "Evacuation Notice",
  "General Advisory",
  "Other",
];

// Same five municipalities seeded in emergency_contacts (schema.sql).
export const MUNICIPALITIES = ["Goa", "San Jose", "Lagonoy", "Tigaon", "Sangay"];

export const THREAT_LEVELS = [
  { value: "low", label: "Low", color: "#20c96b" },
  { value: "moderate", label: "Moderate", color: "#f0a93a" },
  { value: "high", label: "High", color: "#ff7a3d" },
  { value: "critical", label: "Critical", color: "#ff3b3b" },
];

export function threatLevelMeta(value) {
  return THREAT_LEVELS.find((t) => t.value === value) ?? THREAT_LEVELS[0];
}
