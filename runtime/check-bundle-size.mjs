import { readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const LIMIT_BYTES = 20 * 1024;
const distDir = join(dirname(fileURLToPath(import.meta.url)), "dist");

const jsFiles = readdirSync(distDir).filter((file) => file.endsWith(".js"));
if (jsFiles.length === 0) {
  console.error(
    `No built .js files found in ${distDir} — run the build first.`,
  );
  process.exit(1);
}

const sizes = jsFiles.map((file) => ({
  file,
  size: statSync(join(distDir, file)).size,
}));
for (const { file, size } of sizes) {
  console.log(`${file}: ${(size / 1024).toFixed(1)}KB`);
}

const oversized = sizes.filter(({ size }) => size > LIMIT_BYTES);
if (oversized.length > 0) {
  console.error(
    `\nruntime/ bundle exceeds the 20KB minified budget (CLAUDE.md):\n${oversized
      .map(({ file, size }) => `  ${file}: ${(size / 1024).toFixed(1)}KB`)
      .join("\n")}\nReduce bundle size or justify the increase in the PR.`,
  );
  process.exit(1);
}
