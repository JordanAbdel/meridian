// Small time helpers. Clock times are represented as minutes since local midnight.

export const MIN_PER_DAY = 1440;

/** Positive modulo — keeps clock math inside [0, mod). */
export function wrapMin(min: number, mod: number = MIN_PER_DAY): number {
  return ((min % mod) + mod) % mod;
}

/** "HH:MM" -> minutes since midnight. */
export function parseHM(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** minutes -> "HH:MM" (wraps across midnight). */
export function fmtHM(min: number): string {
  const w = Math.round(wrapMin(min));
  const h = Math.floor(w / 60) % 24;
  const m = w % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// --- Date-only helpers (work in local wall-clock; noon anchor avoids DST edges) ---

export function dateAtNoon(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** YYYY-MM-DD in local time. */
export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "Wed 8 Jul" */
export function prettyDate(d: Date): string {
  return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
}
