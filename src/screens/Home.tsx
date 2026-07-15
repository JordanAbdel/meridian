import { useEffect, useState } from "react";
import type { SavedPlan } from "../lib/storage";
import { computeNow } from "../lib/nowState";
import { BLOCK_COLOR } from "../lib/blocks";
import { BlockIcon } from "../components/BlockIcon";

const eyebrow: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--muted)",
};

export function Home({ saved, onViewPlan }: { saved: SavedPlan; onViewPlan: () => void }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const cur = computeNow(saved, now);
  const color = BLOCK_COLOR[cur.type];
  const soft = `color-mix(in oklab, ${color} 12%, transparent)`;
  const ringBorder = `color-mix(in oklab, ${color} 35%, transparent)`;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ ...eyebrow, textAlign: "center", marginTop: 18 }}>
        {cur.routeLabel} · {cur.dayLine}
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "32px 0",
        }}
      >
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `1px solid ${ringBorder}`,
            background: soft,
            color,
            marginBottom: 28,
            transition: "background .35s ease, color .35s ease, border-color .35s ease",
          }}
        >
          <BlockIcon type={cur.type} size={36} />
        </div>

        <div style={{ ...eyebrow, marginBottom: 10 }}>Right now</div>
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-serif)",
            fontSize: 40,
            fontWeight: 400,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            textWrap: "balance",
          }}
        >
          {cur.label}
        </h1>
        <div style={{ marginTop: 10, fontSize: 15, color: "var(--ink-2)" }}>{cur.window}</div>

        <div
          style={{
            width: 170,
            height: 2,
            background: "var(--line-2)",
            borderRadius: 2,
            marginTop: 22,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              background: color,
              width: `${cur.pct}%`,
              transition: "width .35s ease, background .35s ease",
            }}
          />
        </div>
        <div
          style={{
            marginTop: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--muted)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {cur.remaining}
        </div>

        <div style={{ marginTop: 24, maxWidth: 270, fontSize: 13, lineHeight: 1.5, color: "var(--muted)" }}>
          {cur.why}
        </div>
      </div>

      {cur.next.length > 0 && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 14,
            padding: "4px 18px",
          }}
        >
          {cur.next.map((nx, i) => (
            <div
              key={nx.type}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "13px 0",
                borderTop: `1px solid ${i === 0 ? "transparent" : "var(--line)"}`,
                fontSize: i === 0 ? 14 : 13,
                color: i === 0 ? "var(--ink)" : "var(--ink-2)",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: BLOCK_COLOR[nx.type],
                  flex: "none",
                }}
              />
              <span style={{ flex: 1, textAlign: "left" }}>{nx.label}</span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontVariantNumeric: "tabular-nums",
                  color: "var(--muted)",
                }}
              >
                {nx.time}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
        <button
          onClick={onViewPlan}
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
          View full plan →
        </button>
      </div>
    </div>
  );
}
