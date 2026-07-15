export type Screen = "home" | "plan" | "setup";

const ITEMS: { label: string; screen: Screen }[] = [
  { label: "Now", screen: "home" },
  { label: "Plan", screen: "plan" },
  { label: "Setup", screen: "setup" },
];

export function NavBar({
  screen,
  onNavigate,
}: {
  screen: Screen;
  onNavigate: (s: Screen) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
      <div
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 18,
          fontWeight: 500,
          letterSpacing: "-0.01em",
        }}
      >
        Meridian
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {ITEMS.map((it) => {
          const active = screen === it.screen;
          return (
            <button
              key={it.screen}
              onClick={() => onNavigate(it.screen)}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: `1px solid ${active ? "var(--line)" : "transparent"}`,
                background: active ? "var(--surface-2)" : "transparent",
                color: active ? "var(--ink)" : "var(--muted)",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                transition: "color .15s, border-color .15s",
              }}
            >
              {it.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
