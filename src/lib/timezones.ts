// Offline timezone resolution. A curated city list maps free-text input to an IANA zone,
// and offsets are computed from the browser's own Intl database (DST-correct, no network).

export interface City {
  label: string; // "Sydney"
  zone: string; // IANA "Australia/Sydney"
  aliases?: string[]; // extra search terms ("syd", "sydney australia")
}

export const CITIES: City[] = [
  { label: "Sydney", zone: "Australia/Sydney", aliases: ["syd", "aest", "aedt"] },
  { label: "Melbourne", zone: "Australia/Melbourne", aliases: ["mel"] },
  { label: "Auckland", zone: "Pacific/Auckland", aliases: ["akl", "nz"] },
  { label: "Tokyo", zone: "Asia/Tokyo", aliases: ["nrt", "hnd", "jst", "japan"] },
  { label: "Seoul", zone: "Asia/Seoul", aliases: ["icn", "korea"] },
  { label: "Shanghai", zone: "Asia/Shanghai", aliases: ["pvg", "china", "beijing"] },
  { label: "Hong Kong", zone: "Asia/Hong_Kong", aliases: ["hkg"] },
  { label: "Singapore", zone: "Asia/Singapore", aliases: ["sin"] },
  { label: "Bangkok", zone: "Asia/Bangkok", aliases: ["bkk"] },
  { label: "Delhi", zone: "Asia/Kolkata", aliases: ["del", "mumbai", "india", "ist"] },
  { label: "Dubai", zone: "Asia/Dubai", aliases: ["dxb", "uae"] },
  { label: "Istanbul", zone: "Europe/Istanbul", aliases: ["ist", "turkey"] },
  { label: "Johannesburg", zone: "Africa/Johannesburg", aliases: ["jnb", "south africa"] },
  { label: "Cairo", zone: "Africa/Cairo", aliases: ["cai", "egypt"] },
  { label: "Moscow", zone: "Europe/Moscow", aliases: ["mow"] },
  { label: "Athens", zone: "Europe/Athens", aliases: ["ath", "greece"] },
  { label: "Berlin", zone: "Europe/Berlin", aliases: ["ber", "germany", "cet"] },
  { label: "Paris", zone: "Europe/Paris", aliases: ["cdg", "france"] },
  { label: "Madrid", zone: "Europe/Madrid", aliases: ["mad", "spain"] },
  { label: "London", zone: "Europe/London", aliases: ["lhr", "lon", "bst", "gmt", "uk"] },
  { label: "Lisbon", zone: "Europe/Lisbon", aliases: ["lis", "portugal"] },
  { label: "Reykjavik", zone: "Atlantic/Reykjavik", aliases: ["kef", "iceland"] },
  { label: "São Paulo", zone: "America/Sao_Paulo", aliases: ["gru", "brazil", "sao paulo"] },
  { label: "Buenos Aires", zone: "America/Argentina/Buenos_Aires", aliases: ["eze"] },
  { label: "New York", zone: "America/New_York", aliases: ["nyc", "jfk", "est", "edt"] },
  { label: "Toronto", zone: "America/Toronto", aliases: ["yyz", "canada"] },
  { label: "Chicago", zone: "America/Chicago", aliases: ["ord", "cst"] },
  { label: "Mexico City", zone: "America/Mexico_City", aliases: ["mex"] },
  { label: "Denver", zone: "America/Denver", aliases: ["den", "mst"] },
  { label: "Los Angeles", zone: "America/Los_Angeles", aliases: ["lax", "la", "pst", "pdt"] },
  { label: "San Francisco", zone: "America/Los_Angeles", aliases: ["sfo"] },
  { label: "Vancouver", zone: "America/Vancouver", aliases: ["yvr"] },
  { label: "Honolulu", zone: "Pacific/Honolulu", aliases: ["hnl", "hawaii"] },
];

/** UTC offset (in hours, DST-correct for the given instant) for an IANA zone. */
export function offsetHours(zone: string, at: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(at).map((p) => [p.type, p.value]));
  const asUTC = Date.UTC(
    +parts.year,
    +parts.month - 1,
    +parts.day,
    +parts.hour === 24 ? 0 : +parts.hour,
    +parts.minute,
    +parts.second,
  );
  return Math.round((asUTC - at.getTime()) / 60000) / 60;
}

/** Resolve a free-text query ("London", "lhr", "sydney") to a city, or null. */
export function resolveCity(query: string): City | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const exact = CITIES.find((c) => c.label.toLowerCase() === q);
  if (exact) return exact;
  return (
    CITIES.find(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.zone.toLowerCase().includes(q) ||
        c.aliases?.some((a) => a.includes(q)),
    ) ?? null
  );
}
