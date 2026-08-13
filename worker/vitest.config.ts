import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));

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
  test: {
    name: "node",
    exclude: ["**/node_modules/**", "**/dist/**", "**/*.pool.test.ts"],
  },
});
