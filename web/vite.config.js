import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react-dom") || id.includes("node_modules/react/")) return "react-vendor";
          if (id.includes("node_modules/react-router")) return "router";
          if (id.includes("@simplewebauthn")) return "webauthn";
          if (id.includes("node_modules/qrcode")) return "qrcode";
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4000",
      "/uploads": "http://localhost:4000",
      "/sitemap.xml": "http://localhost:4000",
      "/robots.txt": "http://localhost:4000",
    },
  },
});
