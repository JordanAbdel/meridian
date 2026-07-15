import type { NowType } from "./nowState";

// Maps every block type to its design token color.
export const BLOCK_COLOR: Record<NowType, string> = {
  sleep: "var(--c-sleep)",
  light: "var(--c-light)",
  avoid: "var(--c-avoid)",
  caff: "var(--c-caff)",
  mel: "var(--c-mel)",
  flight: "var(--c-flight)",
  free: "var(--muted)",
};

// Order + short labels used by the Full Plan legend (matches the design).
export const LEGEND: { type: NowType; label: string }[] = [
  { type: "sleep", label: "Sleep" },
  { type: "light", label: "Seek bright light" },
  { type: "avoid", label: "Avoid light" },
  { type: "caff", label: "Caffeine OK" },
  { type: "mel", label: "Melatonin" },
  { type: "flight", label: "In transit" },
];
