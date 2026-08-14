import { readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BUDGET_KB = { "runtime.js": 30, "author.js": 22, "download.js": 12 };

const distDir = join(dirname(fileURLToPath(import.meta.url)), "dist");
const jsFiles = readdirSync(distDir).filter((file) => file.endsWith(".js"));

if (jsFiles.length === 0) {
  console.error(
    `No built .js files found in ${distDir} — run the build first.`,
  );
  process.exit(1);
}

const unbudgeted = jsFiles.filter((file) => BUDGET_KB[file] === undefined);
if (unbudgeted.length > 0) {
  console.error(
    `No budget is set for ${unbudgeted.join(", ")}. Every bundle shipped into\nsomebody else's document needs one — add it to check-bundle-size.mjs.`,
  );
  process.exit(1);
}

const sizes = jsFiles.map((file) => ({
  file,
  size: statSync(join(distDir, file)).size,
  limit: BUDGET_KB[file] * 1024,
}));
for (const { file, size, limit } of sizes) {
  console.log(
    `${file}: ${(size / 1024).toFixed(1)}KB of ${(limit / 1024).toFixed(0)}KB`,
  );
}

const oversized = sizes.filter(({ size, limit }) => size > limit);
if (oversized.length > 0) {
  console.error(
    `\nruntime/ bundles exceed their minified budget (CLAUDE.md):\n${oversized
      .map(
        ({ file, size, limit }) =>
          `  ${file}: ${(size / 1024).toFixed(1)}KB of ${(limit / 1024).toFixed(0)}KB`,
      )
      .join("\n")}\nReduce bundle size or justify the increase in the PR.`,
  );
  process.exit(1);
}
