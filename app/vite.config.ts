import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const srcDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "src",
);

const workerDevTarget = "http://127.0.0.1:8787";
const appDevHost = "app.localhost:8787";
const proxyToWorker = {
  target: workerDevTarget,
  headers: { host: appDevHost, origin: `http://${appDevHost}` },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": srcDir,
    },
  },
  server: {
    proxy: {
      "/api": proxyToWorker,
      "/tutorial": proxyToWorker,
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
