import { useEffect, useState } from "react";

// In-memory cache so we don't hit Nominatim more than once per coordinate
// pair per page load — shared across every component that calls this.
const cache = new Map();
const inFlight = new Map();

function cacheKey(lat, lng) {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

// Turns a lat/lng into a human-readable address via OpenStreetMap's free
// Nominatim reverse-geocoding API (same provider as the Leaflet tiles this
// app already uses). Returns null if geocoding fails — callers should fall
// back to showing the raw coordinates.
export async function reverseGeocode(lat, lng) {
  if (lat == null || lng == null) return null;
  const key = cacheKey(lat, lng);

  if (cache.has(key)) return cache.get(key);
  if (inFlight.has(key)) return inFlight.get(key);

  const promise = fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
    { headers: { Accept: "application/json" } }
  )
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      const label = data?.display_name || null;
      cache.set(key, label);
      return label;
    })
    .catch(() => {
      cache.set(key, null);
      return null;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

// React hook: resolves to a human-readable address for (lat, lng).
// If `existingAddress` is already set (e.g. incident.address from the DB),
// it's used as-is and nothing is fetched. Returns:
//   - the existing/resolved address string once available
//   - null while loading or if geocoding failed / no coordinates
export function useAddress(lat, lng, existingAddress) {
  const [label, setLabel] = useState(existingAddress || null);

  useEffect(() => {
    if (existingAddress) {
      setLabel(existingAddress);
      return;
    }
    if (lat == null || lng == null) {
      setLabel(null);
      return;
    }
    let cancelled = false;
    setLabel(null);
    reverseGeocode(lat, lng).then((resolved) => {
      if (!cancelled) setLabel(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [lat, lng, existingAddress]);

  return label;
}
