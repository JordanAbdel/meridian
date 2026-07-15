// Derives the Home ("Now") view-model from a saved plan and the device's local time.
//
// Plan-day times are already in local wall-clock, and the device clock is local wall-clock
// too, so we anchor each block to an absolute instant with the plain Date constructor and
// pick the highest-priority block covering "now".

import type { Direction, PlanDay } from "./planGenerator";
import type { SavedPlan } from "./storage";
import { ymd } from "./time";

export type NowType = "sleep" | "light" | "avoid" | "caff" | "mel" | "flight" | "free";

interface Segment {
  type: NowType;
  start: Date;
  end: Date;
}

export interface NextItem {
  type: NowType;
  label: string;
  time: string; // "HH:MM"
}

export interface NowView {
  routeLabel: string; // "SYD → LON"
  dayLine: string; // "Day 3 of 6"
  type: NowType;
  label: string;
  window: string; // "until 11:00"
  why: string;
  pct: number; // 0..100
  remaining: string; // "1h 20m remaining"
  next: NextItem[];
}

export const LABELS: Record<NowType, string> = {
  sleep: "Sleep",
  light: "Seek bright light",
  avoid: "Avoid bright light",
  caff: "Caffeine OK",
  mel: "Take melatonin",
  flight: "In transit",
  free: "Free time",
};

// Lower index = wins when blocks overlap.
const PRIORITY: NowType[] = ["flight", "sleep", "avoid", "light", "mel", "caff", "free"];

function whyText(type: NowType, dir: Direction): string {
  switch (type) {
    case "sleep":
      return "Protect this window — tonight's sleep is what locks in the shift.";
    case "light":
      return dir === "advance"
        ? "Bright light now pulls your body clock earlier. Get outside if you can."
        : "Bright light now holds your body clock later. Get outside if you can.";
    case "avoid":
      return dir === "advance"
        ? "Keep it dim — evening light would undo today's shift. Sunglasses count."
        : "Keep it dim — morning light would undo today's shift. Sunglasses count.";
    case "caff":
      return "Coffee is fine until the cutoff. After that it works against tonight's sleep.";
    case "mel":
      return "A small dose in this window nudges your clock — timing only, not a dose.";
    case "flight":
      return "In transit. Rest when the cabin dims; the plan picks back up on landing.";
    default:
      return "Nothing scheduled right now — just keep to local time.";
  }
}

function anchor(dateStr: string, hm: string): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, m] = hm.split(":").map(Number);
  return new Date(y, mo - 1, d, h, m, 0, 0);
}

function window(dateStr: string, from: string, to: string, type: NowType): Segment {
  const start = anchor(dateStr, from);
  let end = anchor(dateStr, to);
  if (end.getTime() <= start.getTime()) end = new Date(end.getTime() + 86400000);
  return { type, start, end };
}

function daySegments(d: PlanDay): Segment[] {
  const segs: Segment[] = [
    window(d.date, d.sleepStart, d.sleepEnd, "sleep"),
    window(d.date, d.sleepEnd, d.caffeineCutoff, "caff"),
    ...d.seekLight.map(([a, b]) => window(d.date, a, b, "light")),
    ...d.avoidLight.map(([a, b]) => window(d.date, a, b, "avoid")),
  ];
  if (d.melatoninWindow) segs.push(window(d.date, d.melatoninWindow[0], d.melatoninWindow[1], "mel"));
  return segs;
}

function fmtTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function remainingText(ms: number): string {
  const m = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h > 0
    ? `${h}h ${String(mm).padStart(2, "0")}m remaining`
    : `${mm}m remaining`;
}

function code(label: string): string {
  const letters = label.replace(/[^a-z]/gi, "");
  return (letters.slice(0, 3) || label.slice(0, 3)).toUpperCase();
}

function byPriority(a: Segment, b: Segment): number {
  return PRIORITY.indexOf(a.type) - PRIORITY.indexOf(b.type);
}

export function computeNow(saved: SavedPlan, now: Date): NowView {
  const segs = saved.plan.days.flatMap(daySegments);
  // Actual flight instant overrides everything while airborne.
  segs.push({
    type: "flight",
    start: new Date(saved.departureInstant),
    end: new Date(saved.arrivalInstant),
  });
  segs.sort((a, b) => a.start.getTime() - b.start.getTime());

  const t = now.getTime();
  const active = segs.filter((s) => s.start.getTime() <= t && t < s.end.getTime());

  let cur: Segment;
  if (active.length) {
    cur = active.sort(byPriority)[0];
  } else {
    // A gap between scheduled blocks (or before/after the plan): show "free".
    const prevEnd = segs
      .filter((s) => s.end.getTime() <= t)
      .reduce<Date | null>((acc, s) => (!acc || s.end > acc ? s.end : acc), null);
    const nextStart = segs
      .filter((s) => s.start.getTime() > t)
      .reduce<Date | null>((acc, s) => (!acc || s.start < acc ? s.start : acc), null);
    cur = {
      type: "free",
      start: prevEnd ?? new Date(t - 3600000),
      end: nextStart ?? new Date(t + 3600000),
    };
  }

  const upcoming = segs
    .filter((s) => s.start.getTime() > t)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  const next: NextItem[] = [];
  for (const s of upcoming) {
    if (s.type === cur.type) continue;
    if (next.some((n) => n.type === s.type)) continue;
    next.push({ type: s.type, label: LABELS[s.type], time: fmtTime(s.start) });
    if (next.length === 2) break;
  }

  const span = cur.end.getTime() - cur.start.getTime();
  const pct = span > 0 ? Math.min(100, Math.max(0, ((t - cur.start.getTime()) / span) * 100)) : 0;

  // "Day X of Y" from the plan day matching today's date.
  const todayIdx = saved.plan.days.findIndex((d) => d.date === ymd(now));
  const total = saved.plan.days.length;
  let dayLine: string;
  if (todayIdx >= 0) dayLine = `Day ${todayIdx + 1} of ${total}`;
  else if (t < new Date(saved.plan.days[0].date + "T00:00").getTime()) dayLine = `Starts ${saved.plan.days[0].label}`;
  else dayLine = "Plan complete";

  return {
    routeLabel: `${code(saved.fromLabel)} → ${code(saved.toLabel)}`,
    dayLine,
    type: cur.type,
    label: LABELS[cur.type],
    window: `until ${fmtTime(cur.end)}`,
    why: whyText(cur.type, saved.plan.direction),
    pct,
    remaining: remainingText(cur.end.getTime() - t),
    next,
  };
}

/** Which plan day contains `now`, and how far through the 24h it is (for the timeline marker). */
export function nowMarker(saved: SavedPlan, now: Date): { date: string; pct: number } | null {
  const today = ymd(now);
  if (!saved.plan.days.some((d) => d.date === today)) return null;
  const pct = ((now.getHours() * 60 + now.getMinutes()) / 1440) * 100;
  return { date: today, pct };
}
