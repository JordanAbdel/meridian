import { describe, it, expect } from "vitest";
import { generatePlan, type PlanInput } from "./planGenerator";
import { ymd, dateAtNoon } from "./time";

const base: Omit<PlanInput, "originOffsetH" | "destOffsetH"> = {
  departure: new Date("2026-07-11T21:55"),
  arrival: new Date("2026-07-12T06:25"),
  habitualBedtime: "23:00",
  habitualWaketime: "07:00",
  useMelatonin: true,
  leadDays: 3,
};

describe("generatePlan — known trips", () => {
  it("SYD → LHR is a 9h delay over 6 days (1.5h/day)", () => {
    const p = generatePlan({ ...base, originOffsetH: 10, destOffsetH: 1 });
    expect(p.direction).toBe("delay");
    expect(p.magnitudeHours).toBe(9);
    expect(p.adjustmentDays).toBe(6);
    expect(p.days).toHaveLength(6);
  });

  it("LHR → SYD is a 9h advance over 9 days (1.0h/day)", () => {
    const p = generatePlan({ ...base, originOffsetH: 1, destOffsetH: 10 });
    expect(p.direction).toBe("advance");
    expect(p.magnitudeHours).toBe(9);
    expect(p.adjustmentDays).toBe(9);
    expect(p.days).toHaveLength(9);
  });

  it("short 3h eastward hop advances over 3 days", () => {
    const p = generatePlan({ ...base, originOffsetH: 0, destOffsetH: 3 });
    expect(p.direction).toBe("advance");
    expect(p.adjustmentDays).toBe(3);
  });

  it("LAX → NRT (+17h) flips from advance to the shorter 7h delay", () => {
    const p = generatePlan({ ...base, originOffsetH: -8, destOffsetH: 9 });
    expect(p.shiftHours).toBe(17);
    expect(p.direction).toBe("delay");
    expect(p.magnitudeHours).toBe(7);
    expect(p.adjustmentDays).toBe(5); // ceil(7 / 1.5)
  });
});

describe("generatePlan — anchoring & blocks", () => {
  it("front-loads post-arrival when lead time is short (leadDays 0)", () => {
    const p = generatePlan({ ...base, originOffsetH: 10, destOffsetH: 1, leadDays: 0 });
    // No pre-departure days: shifting starts on the departure date itself.
    expect(p.days[0].date).toBe(ymd(dateAtNoon(base.departure)));
    // The plan therefore runs into post-arrival days.
    const arr = ymd(dateAtNoon(base.arrival));
    expect(p.days.some((d) => d.date > arr)).toBe(true);
  });

  it("clamps pre-departure days to at most 3 even with more lead requested", () => {
    const wide = generatePlan({ ...base, originOffsetH: 1, destOffsetH: 10, leadDays: 3 });
    const dep = dateAtNoon(base.departure).getTime();
    const first = new Date(wide.days[0].date + "T12:00").getTime();
    const preDays = Math.round((dep - first) / (24 * 3600 * 1000));
    expect(preDays).toBeLessThanOrEqual(3);
  });

  it("derives light/sleep/caffeine blocks for a clean 1h advance", () => {
    const p = generatePlan({
      ...base,
      originOffsetH: 0,
      destOffsetH: 1,
      arrival: new Date("2026-07-11T23:30"), // same-day hop -> destination frame
      leadDays: 0, // anchor the single day on the arrival date, not the day before
      useMelatonin: false,
    });
    const d = p.days[p.days.length - 1]; // final day sits exactly on target
    expect(d.tmin).toBe("05:00"); // wake(07:00) - 2h
    expect(d.sleepEnd).toBe("07:00");
    expect(d.sleepStart).toBe("23:00");
    expect(d.seekLight).toEqual([["05:00", "09:00"]]); // 4h after Tmin (advance)
    expect(d.avoidLight).toEqual([["02:00", "05:00"]]); // 3h before Tmin
    expect(d.caffeineCutoff).toBe("14:00"); // bedtime - 9h
    expect(d.melatoninWindow).toBeNull();
  });

  it("adds a melatonin timing window only when enabled", () => {
    const on = generatePlan({ ...base, originOffsetH: 10, destOffsetH: 1 });
    expect(on.days[0].melatoninWindow).not.toBeNull();
    const off = generatePlan({ ...base, originOffsetH: 10, destOffsetH: 1, useMelatonin: false });
    expect(off.days[0].melatoninWindow).toBeNull();
  });
});
