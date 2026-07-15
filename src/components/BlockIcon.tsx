import type { NowType } from "../lib/nowState";

// Stroke icons (1.5px, currentColor) — same set as the design, plus flight/free.
export function BlockIcon({ type, size = 36 }: { type: NowType; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (type) {
    case "light":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8" />
        </svg>
      );
    case "avoid":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8" />
          <path d="M3.5 20.5l17-17" />
        </svg>
      );
    case "sleep":
      return (
        <svg {...common}>
          <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" />
        </svg>
      );
    case "caff":
      return (
        <svg {...common}>
          <path d="M5 8h11v6.5a4.5 4.5 0 0 1-4.5 4.5h-2A4.5 4.5 0 0 1 5 14.5z" />
          <path d="M16 9.5h1.5a2.75 2.75 0 0 1 0 5.5H16" />
        </svg>
      );
    case "mel":
      return (
        <svg {...common}>
          <rect x="8" y="2.5" width="8" height="19" rx="4" transform="rotate(45 12 12)" />
          <path d="M8.5 8.5l7 7" transform="rotate(90 12 12)" />
        </svg>
      );
    case "flight":
      return (
        <svg {...common}>
          <path d="M10.5 3.5a1.5 1.5 0 0 1 3 0V9l7 4.2v2.3l-7-2.1v4.1l2 1.4v1.6l-3.5-1-3.5 1v-1.6l2-1.4v-4.1l-7 2.1v-2.3l7-4.2z" />
        </svg>
      );
    default: // free — a simple clock
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      );
  }
}
