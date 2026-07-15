import { useState } from "react";
import { NavBar, type Screen } from "./components/NavBar";
import { Home } from "./screens/Home";
import { FullPlan } from "./screens/FullPlan";
import { TripSetup } from "./screens/TripSetup";
import { DEFAULT_FORM, loadPlan, savePlan, type SavedPlan } from "./lib/storage";

export default function App() {
  const [saved, setSaved] = useState<SavedPlan | null>(() => loadPlan());
  const [screen, setScreen] = useState<Screen>(() => (loadPlan() ? "home" : "setup"));

  function handleGenerate(next: SavedPlan) {
    savePlan(next);
    setSaved(next);
    setScreen("home");
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center" }}>
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          // Installed-PWA mode draws edge-to-edge; keep content clear of the
          // status bar / Dynamic Island and the home indicator.
          paddingTop: "max(20px, env(safe-area-inset-top))",
          paddingRight: "max(24px, env(safe-area-inset-right))",
          paddingBottom: "max(28px, env(safe-area-inset-bottom))",
          paddingLeft: "max(24px, env(safe-area-inset-left))",
          boxSizing: "border-box",
        }}
      >
        <NavBar screen={screen} onNavigate={setScreen} />

        {screen === "setup" && (
          <TripSetup initial={saved?.form ?? DEFAULT_FORM} onGenerate={handleGenerate} />
        )}
        {screen === "home" &&
          (saved ? (
            <Home saved={saved} onViewPlan={() => setScreen("plan")} />
          ) : (
            <EmptyState onSetup={() => setScreen("setup")} />
          ))}
        {screen === "plan" &&
          (saved ? (
            <FullPlan saved={saved} onBack={() => setScreen("home")} />
          ) : (
            <EmptyState onSetup={() => setScreen("setup")} />
          ))}
      </div>
    </div>
  );
}

function EmptyState({ onSetup }: { onSetup: () => void }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 16,
        padding: "48px 0",
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: "var(--font-serif)",
          fontSize: 28,
          fontWeight: 400,
          letterSpacing: "-0.02em",
        }}
      >
        No trip yet
      </h1>
      <div style={{ fontSize: 14, color: "var(--muted)", maxWidth: 280, lineHeight: 1.5 }}>
        Set up a flight and your usual sleep, and Meridian will build your adjustment plan.
      </div>
      <button
        onClick={onSetup}
        style={{
          padding: "11px 18px",
          borderRadius: 999,
          border: "none",
          background: "var(--accent)",
          color: "#fff",
          fontSize: 14,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        Set up a trip
      </button>
    </div>
  );
}
