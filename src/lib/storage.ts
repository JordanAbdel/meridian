// localStorage persistence for the last generated plan + the raw form inputs.

import type { Plan } from "./planGenerator";

export interface TripForm {
  from: string;
  to: string;
  // Set by flight-number lookup: exact IANA zones for the airports. When present they
  // take precedence over resolving the From/To text against the offline city list.
  fromZone?: string;
  toZone?: string;
  dep: string; // datetime-local value, e.g. "2026-07-11T21:55"
  arr: string;
  bed: string; // "HH:MM"
  wake: string;
  useMel: boolean;
  lead: number; // 0..3
}

export interface SavedPlan {
  form: TripForm;
  fromLabel: string;
  toLabel: string;
  departureLocal: string; // "YYYY-MM-DDTHH:MM" in the origin's wall clock
  arrivalLocal: string; // "YYYY-MM-DDTHH:MM" in the destination's wall clock
  departureInstant: number; // ms since epoch (UTC) — for the airborne check
  arrivalInstant: number;
  originOffsetH: number;
  destOffsetH: number;
  plan: Plan;
  generatedAt: string;
}

const KEY = "meridian.plan.v1";

export function loadPlan(): SavedPlan | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedPlan) : null;
  } catch {
    return null;
  }
}

export function savePlan(p: SavedPlan): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Storage full or unavailable — the app still works for this session.
  }
}

export function clearPlan(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export const DEFAULT_FORM: TripForm = {
  from: "Sydney",
  to: "London",
  dep: "2026-07-11T21:55",
  arr: "2026-07-12T06:25",
  bed: "23:00",
  wake: "07:00",
  useMel: true,
  lead: 3,
};
