import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const srcDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "src",
);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": srcDir,
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        headers: { host: "app.localhost:8787" },
      },
      "/tutorial": {
        target: "http://127.0.0.1:8787",
        headers: { host: "app.localhost:8787" },
      },
    },
  },
  test: {
    environment: "happy-dom",
    setupFiles: ["./src/test-setup.ts"],
    environmentOptions: {
      happyDOM: { settings: { disableIframePageLoading: true } },
    },
  },
});
