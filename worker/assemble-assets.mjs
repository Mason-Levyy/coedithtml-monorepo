import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workerDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(workerDir, "public");

// One Worker serves two origins but Wrangler allows only one assets
// directory, so the app build and the runtime bundle are staged into a
// single tree. Origin classification, not directory layout, is what keeps
// app assets off the sandbox origin.
await rm(publicDir, { recursive: true, force: true });
await mkdir(publicDir, { recursive: true });

await cp(path.join(workerDir, "../app/dist"), publicDir, { recursive: true });
await cp(
  path.join(workerDir, "../runtime/dist/runtime.js"),
  path.join(publicDir, "runtime.js"),
);
