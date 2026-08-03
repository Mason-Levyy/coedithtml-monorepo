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
  test: {
    environment: "happy-dom",
    setupFiles: ["./src/test-setup.ts"],
    // Otherwise happy-dom actually fetches every rendered <iframe src>.
    environmentOptions: {
      happyDOM: { settings: { disableIframePageLoading: true } },
    },
  },
});
