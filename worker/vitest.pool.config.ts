import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineWorkersConfig({
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
    name: "workers",
    include: ["**/*.pool.test.ts"],
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.jsonc" },
        singleWorker: true,
        isolatedStorage: false,
      },
    },
  },
});
