import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      workbox: {
        // Precache the app shell + self-hosted fonts so the app runs fully offline.
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
      },
      manifest: {
        name: "Meridian — Jet-lag Planner",
        short_name: "Meridian",
        description:
          "Turn a flight and your sleep schedule into a day-by-day circadian adjustment plan.",
        start_url: ".",
        scope: ".",
        display: "standalone",
        background_color: "#1a1814",
        theme_color: "#1a1814",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
});
