// Pure circadian-adjustment plan generator. No I/O, no DOM — fully unit-testable.
//
// Model: the internal clock (its lowest core-body-temperature point, Tmin) marches toward
// the destination each day, capped per day. Everything is derived from Tmin using the
// light phase-response curve. Times are expressed in each day's local wall clock (origin
// timezone until the arrival day, destination timezone from arrival onward), so a
// traveller's phone — which shows the local wall clock — can be compared directly.

import { parseHM, fmtHM, wrapMin, addDays, dateAtNoon, ymd, prettyDate } from "./time";

export type BlockType = "sleep" | "light" | "avoid" | "caff" | "mel" | "flight";
export type Direction = "advance" | "delay" | "none";

export interface PlanInput {
  originOffsetH: number; // origin UTC offset in hours (e.g. Sydney AEST = 10)
  destOffsetH: number; // destination UTC offset in hours (e.g. London BST = 1)
  departure: Date; // local wall-clock departure
  arrival: Date; // local wall-clock arrival
  habitualBedtime: string; // "HH:MM"
  habitualWaketime: string; // "HH:MM"
  useMelatonin: boolean;
  leadDays: number; // days before departure to start shifting (0..3)
}

export interface PlanDay {
  date: string; // YYYY-MM-DD
  label: string; // "Wed 8 Jul"
  tz: "origin" | "dest"; // which timezone this day's times are expressed in
  tmin: string; // "HH:MM"
  sleepStart: string;
  sleepEnd: string;
  seekLight: [string, string][];
  avoidLight: [string, string][];
  caffeineCutoff: string;
  melatoninWindow: [string, string] | null;
}

export interface Plan {
  direction: Direction;
  shiftHours: number; // raw signed shift (destOffset - originOffset)
  magnitudeHours: number; // effective shift magnitude after the >9h flip rule
  adjustmentDays: number;
  days: PlanDay[];
}

const ADVANCE_CAP = 1.0; // hours/day
const DELAY_CAP = 1.5; // hours/day
const H = 60; // minutes per hour

export function generatePlan(input: PlanInput): Plan {
  const wakeMin = parseHM(input.habitualWaketime);
  const bedMin = parseHM(input.habitualBedtime);
  const sleepDur = wrapMin(wakeMin - bedMin); // minutes asleep

  // Step 2: shift + direction, with the eastward-advance-over-9h flip to a shorter delay.
  const shift = input.destOffsetH - input.originOffsetH;
  let direction: Direction;
  let magnitude: number; // positive hours
  if (shift === 0) {
    direction = "none";
    magnitude = 0;
  } else if (shift > 9) {
    direction = "delay";
    magnitude = 24 - shift;
  } else if (shift > 0) {
    direction = "advance";
    magnitude = shift;
  } else {
    direction = "delay";
    magnitude = -shift;
  }

  // Step 3: daily cap + number of shifting days.
  const cap = direction === "advance" ? ADVANCE_CAP : DELAY_CAP;
  const adjustmentDays = magnitude === 0 ? 1 : Math.ceil(magnitude / cap);
  const sign = direction === "advance" ? -1 : 1; // Tmin moves earlier (advance) or later (delay)

  // Step 1 + 4: Tmin in the destination frame; start pulled off target by the full shift.
  // Target Tmin is habitual (wake - 2h); the schedule marches from startTminDest to it.
  const startTminDest = wrapMin(wakeMin - 120 + shift * H);

  // Anchor the schedule so shifting begins up to `leadDays` (max 3) before departure.
  const depDate = dateAtNoon(input.departure);
  const arrDate = dateAtNoon(input.arrival);
  const preDays = Math.min(input.leadDays, 3, adjustmentDays);
  const planStart = addDays(depDate, -preDays);

  const days: PlanDay[] = [];
  for (let i = 0; i < adjustmentDays; i++) {
    const dayDate = addDays(planStart, i);
    const cumulative = Math.min((i + 1) * cap, magnitude); // hours shifted by end of day i
    const tminDest = wrapMin(startTminDest + sign * cumulative * H);

    // Show origin-local times until the arrival day, destination-local from arrival onward.
    const useOrigin = dayDate.getTime() < arrDate.getTime();
    const tminLocal = useOrigin ? wrapMin(tminDest - shift * H) : tminDest;

    days.push(
      buildDay(dayDate, useOrigin ? "origin" : "dest", tminLocal, direction, sleepDur, input.useMelatonin),
    );
  }

  return { direction, shiftHours: shift, magnitudeHours: magnitude, adjustmentDays, days };
}

function buildDay(
  date: Date,
  tz: "origin" | "dest",
  tmin: number,
  direction: Direction,
  sleepDur: number,
  useMel: boolean,
): PlanDay {
  // Step 4: light windows relative to Tmin (phase-response curve).
  let seekLight: [number, number][];
  let avoidLight: [number, number][];
  if (direction === "advance") {
    seekLight = [[tmin, tmin + 4 * H]]; // ~4h after Tmin
    avoidLight = [[tmin - 3 * H, tmin]]; // ~3h before Tmin
  } else {
    seekLight = [[tmin - 4 * H, tmin]]; // ~4h before Tmin
    avoidLight = [[tmin, tmin + 3 * H]]; // ~3h after Tmin
  }

  const wake = tmin + 2 * H; // target wake for this day
  const sleepEnd = wake;
  const sleepStart = wake - sleepDur; // target bedtime
  const caffeineCutoff = sleepStart - 9 * H; // allowed from wake until ~9h before bedtime

  let mel: [number, number] | null = null;
  if (useMel) {
    if (direction === "advance") {
      const s = sleepStart - 5 * H; // ~5h before target bedtime
      mel = [s, s + 30];
    } else {
      mel = [wake, wake + 30]; // shortly after target wake
    }
  }

  const pair = ([a, b]: [number, number]): [string, string] => [fmtHM(a), fmtHM(b)];
  return {
    date: ymd(date),
    label: prettyDate(date),
    tz,
    tmin: fmtHM(tmin),
    sleepStart: fmtHM(sleepStart),
    sleepEnd: fmtHM(sleepEnd),
    seekLight: seekLight.map(pair),
    avoidLight: avoidLight.map(pair),
    caffeineCutoff: fmtHM(caffeineCutoff),
    melatoninWindow: mel ? pair(mel) : null,
  };
}
