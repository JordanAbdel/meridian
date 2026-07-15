import { useState } from "react";
import type { SavedPlan, TripForm } from "../lib/storage";
import { generatePlan } from "../lib/planGenerator";
import { resolveCity, offsetHours } from "../lib/timezones";
import { lookupTrip } from "../lib/flightLookup";
import { Disclaimer } from "../components/Disclaimer";

const API_KEY_STORAGE = "meridian.rapidapi.key";

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
  // Let fields shrink inside the grid — datetime inputs otherwise force the
  // page wider than a phone screen.
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
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
  const set = (k: keyof TripForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    // Manual edits to From/To invalidate any zone pinned by a flight lookup.
    const zoneReset = k === "from" ? { fromZone: undefined } : k === "to" ? { toZone: undefined } : {};
    setF({ ...f, [k]: e.target.value, ...zoneReset });
  };

  // Flight-number lookup state.
  const [flightNos, setFlightNos] = useState("");
  const [flightDate, setFlightDate] = useState("");
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_STORAGE) ?? "");
  const [editingKey, setEditingKey] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupMsg, setLookupMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleLookup() {
    const nos = flightNos
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!nos.length) return setLookupMsg({ ok: false, text: "Enter a flight number, like QF1." });
    if (!flightDate) return setLookupMsg({ ok: false, text: "Pick the departure date." });
    if (!apiKey.trim()) {
      return setLookupMsg({ ok: false, text: "Paste your free RapidAPI key first (see README)." });
    }
    setLookingUp(true);
    setLookupMsg(null);
    try {
      localStorage.setItem(API_KEY_STORAGE, apiKey.trim());
      const legs = await lookupTrip(nos, flightDate, apiKey.trim());
      const first = legs[0];
      const last = legs[legs.length - 1];
      setF({
        ...f,
        from: first.depCity || first.depIata,
        to: last.arrCity || last.arrIata,
        fromZone: first.depZone,
        toZone: last.arrZone,
        dep: first.depLocal,
        arr: last.arrLocal,
      });
      setEditingKey(false);
      const route = [first.depIata, ...legs.map((l) => l.arrIata)].join(" → ");
      setLookupMsg({ ok: true, text: `${legs.map((l) => l.flightNo).join(" + ")} · ${route} — filled in below.` });
    } catch (err) {
      setLookupMsg({ ok: false, text: err instanceof Error ? err.message : "Lookup failed." });
    } finally {
      setLookingUp(false);
    }
  }

  const leadOpts = [0, 1, 2, 3];

  function handleGenerate() {
    const fromZone = f.fromZone ?? resolveCity(f.from)?.zone;
    const toZone = f.toZone ?? resolveCity(f.to)?.zone;
    if (!fromZone) return setError(`Couldn't find a city or timezone for "${f.from}".`);
    if (!toZone) return setError(`Couldn't find a city or timezone for "${f.to}".`);
    if (!f.dep || !f.arr) return setError("Add both a departure and an arrival time.");
    if (!f.bed || !f.wake) return setError("Add your usual bedtime and wake time.");

    const depRef = new Date(f.dep);
    const arrRef = new Date(f.arr);
    const originOffsetH = offsetHours(fromZone, depRef);
    const destOffsetH = offsetHours(toZone, arrRef);

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
      fromLabel: resolveCity(f.from)?.label ?? f.from,
      toLabel: resolveCity(f.to)?.label ?? f.to,
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

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 14,
          padding: "14px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={label}>Fill from flight number</div>
        <div className="lookup-grid">
          <input
            value={flightNos}
            onChange={(e) => setFlightNos(e.target.value)}
            placeholder="QF1 — or QF11, AA100"
            style={{ ...field, background: "var(--surface-2)", border: "1px solid var(--line-2)" }}
          />
          <input
            type="date"
            value={flightDate}
            onChange={(e) => setFlightDate(e.target.value)}
            style={{
              ...timeField,
              background: "var(--surface-2)",
              border: "1px solid var(--line-2)",
            }}
          />
        </div>
        {(!apiKey || editingKey) ? (
          <input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="RapidAPI key (free — aerodatabox, saved on this device)"
            style={{ ...field, background: "var(--surface-2)", border: "1px solid var(--line-2)", fontSize: 12.5 }}
          />
        ) : (
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            API key saved on this device ·{" "}
            <span
              onClick={() => setEditingKey(true)}
              style={{ color: "var(--ink-2)", cursor: "pointer", textDecoration: "underline" }}
            >
              change
            </span>
          </div>
        )}
        <button
          onClick={handleLookup}
          disabled={lookingUp}
          style={{
            padding: "10px 14px",
            borderRadius: 999,
            border: "1px solid var(--line-2)",
            background: "var(--surface-2)",
            color: lookingUp ? "var(--muted)" : "var(--ink)",
            fontSize: 13,
            fontWeight: 500,
            cursor: lookingUp ? "default" : "pointer",
            transition: "color .15s, border-color .15s",
          }}
        >
          {lookingUp ? "Looking up…" : "Look up flight"}
        </button>
        {lookupMsg && (
          <div
            style={{
              fontSize: 12.5,
              lineHeight: 1.5,
              color: lookupMsg.ok ? "var(--ink-2)" : "var(--accent)",
            }}
          >
            {lookupMsg.text}
          </div>
        )}
        <div style={{ fontSize: 11.5, lineHeight: 1.5, color: "var(--muted-2)" }}>
          Needs a connection just for the lookup — add connecting flights in travel order.
          Or skip it and fill the fields below yourself.
        </div>
      </div>

      <div className="setup-grid">
        <Labeled text="From">
          <input value={f.from} onChange={set("from")} placeholder="City or timezone" style={field} />
        </Labeled>
        <Labeled text="To">
          <input value={f.to} onChange={set("to")} placeholder="City or timezone" style={field} />
        </Labeled>
        <Labeled text="Departure" smFull>
          <input type="datetime-local" value={f.dep} onChange={set("dep")} style={timeField} />
        </Labeled>
        <Labeled text="Arrival" smFull>
          <input type="datetime-local" value={f.arr} onChange={set("arr")} style={timeField} />
        </Labeled>
        <Labeled text="Usual bedtime" smFull>
          <input type="time" value={f.bed} onChange={set("bed")} style={timeField} />
        </Labeled>
        <Labeled text="Usual wake" smFull>
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

function Labeled({
  text,
  smFull,
  children,
}: {
  text: string;
  smFull?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={smFull ? "sm-full" : undefined}
      style={{ display: "flex", flexDirection: "column", gap: 7, minWidth: 0 }}
    >
      <label style={label}>{text}</label>
      {children}
    </div>
  );
}
