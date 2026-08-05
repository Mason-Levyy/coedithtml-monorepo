import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));

// Mirrors tsconfig.json. `@/lib` comes first because these match in order, and
// the trailing slash keeps `@/` off scoped packages like `@coedithtml/protocol`.
export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@\/lib\//,
        replacement: `${path.resolve(packageRoot, "lib")}/`,
      },
      { find: /^@\//, replacement: `${path.resolve(packageRoot, "src")}/` },
    ],
  },
});
