import type { SavedPlan } from "../lib/storage";
import type { PlanDay } from "../lib/planGenerator";
import type { NowType } from "../lib/nowState";
import { BLOCK_COLOR, LEGEND } from "../lib/blocks";
import { LABELS } from "../lib/nowState";
import { ymd } from "../lib/time";
import { Disclaimer } from "../components/Disclaimer";

interface Seg {
  left: number;
  width: number;
  color: string;
  title: string;
}

function toHours(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h + m / 60;
}

function span(out: Seg[], from: number, to: number, type: NowType): void {
  if (to - from <= 0.01) return;
  out.push({
    left: (from / 24) * 100,
    width: ((to - from) / 24) * 100,
    color: BLOCK_COLOR[type],
    title: `${LABELS[type]} ${fmtH(from)}–${fmtH(to)}`,
  });
}

function fmtH(h: number): string {
  const m = Math.round(h * 60);
  return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function pushWindow(out: Seg[], from: string, to: string, type: NowType): void {
  const s = toHours(from);
  const e = toHours(to);
  if (e <= s) {
    span(out, s, 24, type);
    span(out, 0, e, type);
  } else {
    span(out, s, e, type);
  }
}

function daySegs(day: PlanDay): Seg[] {
  const out: Seg[] = [];
  pushWindow(out, day.sleepStart, day.sleepEnd, "sleep");
  pushWindow(out, day.sleepEnd, day.caffeineCutoff, "caff");
  for (const [a, b] of day.seekLight) pushWindow(out, a, b, "light");
  for (const [a, b] of day.avoidLight) pushWindow(out, a, b, "avoid");
  if (day.melatoninWindow) pushWindow(out, day.melatoninWindow[0], day.melatoninWindow[1], "mel");
  return out;
}

function flightSegs(day: PlanDay, saved: SavedPlan): Seg[] {
  const [depDay, depTime] = saved.departureLocal.split("T");
  const [arrDay, arrTime] = saved.arrivalLocal.split("T");
  const depH = toHours(depTime);
  const arrH = toHours(arrTime);
  const out: Seg[] = [];
  if (day.date === depDay && day.date === arrDay) span(out, depH, arrH, "flight");
  else if (day.date === depDay) span(out, depH, 24, "flight");
  else if (day.date === arrDay) span(out, 0, arrH, "flight");
  return out;
}

function noteFor(day: PlanDay, i: number, total: number, saved: SavedPlan): string {
  const [depDay, depTime] = saved.departureLocal.split("T");
  const [arrDay, arrTime] = saved.arrivalLocal.split("T");
  const advance = saved.plan.direction === "advance";
  if (day.date === depDay) {
    return `Fly out at ${depTime}. Eat before boarding, then sleep once the cabin dims.`;
  }
  if (day.date === arrDay) {
    return `Land at ${arrTime}. Get a bright morning outdoors and stay up until bed at ${day.sleepStart}.`;
  }
  const core = advance
    ? `Shift earlier — bright light on waking, dim the evening. Bed at ${day.sleepStart}.`
    : `Shift later — hold off morning light, seek it later. Bed at ${day.sleepStart}.`;
  if (i === 0) return `Begin shifting. ${core}`;
  if (i === total - 1) return "You should feel close to local — hold the routine one more day to lock it in.";
  return core;
}

export function FullPlan({ saved, onBack }: { saved: SavedPlan; onBack: () => void }) {
  const today = ymd(new Date());
  const nowFrac = ((new Date().getHours() * 60 + new Date().getMinutes()) / 1440) * 100;
  const days = saved.plan.days;
  const mag = Math.round(saved.plan.magnitudeHours);
  const dir = saved.plan.direction === "advance" ? "earlier" : "later";

  return (
    <div style={{ paddingTop: 26 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-serif)",
            fontSize: 28,
            fontWeight: 400,
            letterSpacing: "-0.02em",
          }}
        >
          The full plan
        </h1>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--muted)",
          }}
        >
          {saved.fromLabel} → {saved.toLabel}
        </div>
      </div>
      <div style={{ marginTop: 6, fontSize: 13, color: "var(--muted)" }}>
        {saved.plan.direction === "none"
          ? "No timezone change — you're already aligned."
          : `${days.length} days, shifting your clock ${mag} hour${mag === 1 ? "" : "s"} ${dir}.`}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px 16px",
          marginTop: 18,
          padding: "12px 14px",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 14,
        }}
      >
        {LEGEND.map((lg) => (
          <span
            key={lg.type}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--ink-2)" }}
          >
            <span style={{ width: 9, height: 9, borderRadius: 3, background: BLOCK_COLOR[lg.type] }} />
            {lg.label}
          </span>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
        {days.map((day, i) => {
          const isToday = day.date === today;
          const segs = [...daySegs(day), ...flightSegs(day, saved)];
          return (
            <div
              key={day.date + i}
              style={{
                background: "var(--surface)",
                border: `1px solid ${isToday ? "var(--line-2)" : "var(--line)"}`,
                borderRadius: 14,
                padding: "16px 18px",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontFamily: "var(--font-serif)", fontSize: 16, fontWeight: 500, letterSpacing: "-0.01em" }}>
                  Day {i + 1}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                  }}
                >
                  {day.label} · {day.tz === "origin" ? saved.fromLabel : saved.toLabel}
                </span>
                {isToday && (
                  <span
                    style={{
                      marginLeft: "auto",
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--accent)",
                    }}
                  >
                    Today
                  </span>
                )}
              </div>

              <div
                style={{
                  position: "relative",
                  height: 26,
                  borderRadius: 7,
                  background: "var(--surface-2)",
                  marginTop: 12,
                  overflow: "visible",
                }}
              >
                {segs.map((s, j) => (
                  <div
                    key={j}
                    title={s.title}
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: `${s.left}%`,
                      width: `${s.width}%`,
                      background: s.color,
                      borderRadius: 5,
                      opacity: 0.9,
                    }}
                  />
                ))}
                {isToday && (
                  <>
                    <div
                      style={{
                        position: "absolute",
                        top: -5,
                        bottom: -5,
                        left: `${nowFrac}%`,
                        width: 2,
                        background: "var(--ink)",
                        borderRadius: 2,
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: -19,
                        left: `${nowFrac}%`,
                        transform: "translateX(-50%)",
                        fontFamily: "var(--font-mono)",
                        fontSize: 9,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--ink)",
                      }}
                    >
                      now
                    </div>
                  </>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 7,
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--muted-2)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <span>00</span>
                <span>06</span>
                <span>12</span>
                <span>18</span>
                <span>24</span>
              </div>

              <div style={{ marginTop: 10, fontSize: 12.5, lineHeight: 1.5, color: "var(--muted)" }}>
                {noteFor(day, i, days.length, saved)}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
        <button
          onClick={onBack}
          style={{
            padding: "9px 16px",
            borderRadius: 999,
            border: "1px solid transparent",
            background: "transparent",
            color: "var(--muted)",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          ← Back to now
        </button>
      </div>

      <div style={{ marginTop: 22 }}>
        <Disclaimer />
      </div>
    </div>
  );
}
