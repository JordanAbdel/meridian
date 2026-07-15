import { useState } from "react";
import type { SavedPlan, TripForm } from "../lib/storage";
import { generatePlan } from "../lib/planGenerator";
import { resolveCity, offsetHours } from "../lib/timezones";
import { Disclaimer } from "../components/Disclaimer";

const label: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--muted)",
};
const field: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 10,
  padding: "11px 12px",
  fontSize: 14,
  color: "var(--ink)",
  transition: "border-color .15s",
};
const timeField: React.CSSProperties = {
  ...field,
  padding: "10px 12px",
  fontSize: 13,
  fontFamily: "var(--font-mono)",
};

/** Convert an origin/dest local wall-clock string to a UTC instant using its offset. */
function localToInstant(local: string, offsetH: number): number {
  const [d, t] = local.split("T");
  const [y, mo, da] = d.split("-").map(Number);
  const [h, mi] = t.split(":").map(Number);
  return Date.UTC(y, mo - 1, da, h, mi) - offsetH * 3600000;
}

export function TripSetup({
  initial,
  onGenerate,
}: {
  initial: TripForm;
  onGenerate: (saved: SavedPlan) => void;
}) {
  const [f, setF] = useState<TripForm>(initial);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof TripForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.value });

  const leadOpts = [0, 1, 2, 3];

  function handleGenerate() {
    const fromCity = resolveCity(f.from);
    const toCity = resolveCity(f.to);
    if (!fromCity) return setError(`Couldn't find a city or timezone for "${f.from}".`);
    if (!toCity) return setError(`Couldn't find a city or timezone for "${f.to}".`);
    if (!f.dep || !f.arr) return setError("Add both a departure and an arrival time.");
    if (!f.bed || !f.wake) return setError("Add your usual bedtime and wake time.");

    const depRef = new Date(f.dep);
    const arrRef = new Date(f.arr);
    const originOffsetH = offsetHours(fromCity.zone, depRef);
    const destOffsetH = offsetHours(toCity.zone, arrRef);

    const plan = generatePlan({
      originOffsetH,
      destOffsetH,
      departure: depRef,
      arrival: arrRef,
      habitualBedtime: f.bed,
      habitualWaketime: f.wake,
      useMelatonin: f.useMel,
      leadDays: f.lead,
    });

    onGenerate({
      form: f,
      fromLabel: fromCity.label,
      toLabel: toCity.label,
      departureLocal: f.dep,
      arrivalLocal: f.arr,
      departureInstant: localToInstant(f.dep, originOffsetH),
      arrivalInstant: localToInstant(f.arr, destOffsetH),
      originOffsetH,
      destOffsetH,
      plan,
      generatedAt: new Date().toISOString(),
    });
  }

  return (
    <div style={{ paddingTop: 26, display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-serif)",
            fontSize: 28,
            fontWeight: 400,
            letterSpacing: "-0.02em",
          }}
        >
          Where are you headed?
        </h1>
        <div style={{ marginTop: 6, fontSize: 13, color: "var(--muted)" }}>
          A flight and your usual sleep — that's all Meridian needs.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Labeled text="From">
          <input value={f.from} onChange={set("from")} placeholder="City or timezone" style={field} />
        </Labeled>
        <Labeled text="To">
          <input value={f.to} onChange={set("to")} placeholder="City or timezone" style={field} />
        </Labeled>
        <Labeled text="Departure">
          <input type="datetime-local" value={f.dep} onChange={set("dep")} style={timeField} />
        </Labeled>
        <Labeled text="Arrival">
          <input type="datetime-local" value={f.arr} onChange={set("arr")} style={timeField} />
        </Labeled>
        <Labeled text="Usual bedtime">
          <input type="time" value={f.bed} onChange={set("bed")} style={timeField} />
        </Labeled>
        <Labeled text="Usual wake">
          <input type="time" value={f.wake} onChange={set("wake")} style={timeField} />
        </Labeled>
      </div>

      <div
        onClick={() => setF({ ...f, useMel: !f.useMel })}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 14,
          padding: "14px 16px",
          cursor: "pointer",
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Use melatonin</div>
          <div style={{ marginTop: 2, fontSize: 12.5, color: "var(--muted)" }}>
            Adds a nightly timing window to the plan.
          </div>
        </div>
        <div
          style={{
            width: 40,
            height: 24,
            borderRadius: 999,
            background: f.useMel ? "var(--accent)" : "var(--surface-2)",
            position: "relative",
            transition: "background .15s",
            flex: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 3,
              left: f.useMel ? 19 : 3,
              width: 18,
              height: 18,
              borderRadius: 999,
              background: "var(--ink)",
              transition: "left .15s",
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        <label style={label}>Start shifting</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {leadOpts.map((n) => {
            const active = f.lead === n;
            return (
              <button
                key={n}
                onClick={() => setF({ ...f, lead: n })}
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: `1px solid ${active ? "var(--ink)" : "var(--line)"}`,
                  background: active ? "var(--ink)" : "var(--surface)",
                  color: active ? "var(--bg)" : "var(--ink-2)",
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "background .15s, color .15s, border-color .15s",
                }}
              >
                {n === 0 ? "Day of flight" : `${n} day${n === 1 ? "" : "s"} before`}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div style={{ fontSize: 13, color: "var(--accent)", lineHeight: 1.5 }}>{error}</div>
      )}

      <button
        onClick={handleGenerate}
        style={{
          marginTop: 4,
          padding: "13px 16px",
          borderRadius: 999,
          border: "none",
          background: "var(--accent)",
          color: "#fff",
          fontSize: 14,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        Generate plan
      </button>

      <Disclaimer />
    </div>
  );
}

function Labeled({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <label style={label}>{text}</label>
      {children}
    </div>
  );
}
