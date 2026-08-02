import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));

// Mirrors the paths in tsconfig.json. `@/lib` is listed first because aliases
// match by prefix in order, and `@` would otherwise swallow it.
export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\/lib/, replacement: path.resolve(packageRoot, "lib") },
      { find: /^@/, replacement: path.resolve(packageRoot, "src") },
    ],
  },
});
