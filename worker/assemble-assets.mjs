import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workerDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(workerDir, "public");

await mkdir(publicDir, { recursive: true });
for (const entry of await readdir(publicDir)) {
  await rm(path.join(publicDir, entry), { recursive: true, force: true });
}

await cp(path.join(workerDir, "../app/dist"), publicDir, { recursive: true });
for (const bundle of ["runtime.js", "author.js", "download.js"]) {
  await cp(
    path.join(workerDir, "../runtime/dist", bundle),
    path.join(publicDir, bundle),
  );
}

await cp(
  path.join(workerDir, "tutorial/deck.html"),
  path.join(publicDir, "tutorial-deck.html"),
);

const websitePublic = path.join(workerDir, "../website/public");
for (const asset of [
  ".well-known",
  "auth.md",
  "openapi.json",
  "openapi.yaml",
  "llms.txt",
  "_headers",
]) {
  const src = path.join(websitePublic, asset);
  if (existsSync(src)) {
    await cp(src, path.join(publicDir, asset), { recursive: true });
  }
}
