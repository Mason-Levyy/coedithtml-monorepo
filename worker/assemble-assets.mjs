import { cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workerDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(workerDir, "public");

await mkdir(publicDir, { recursive: true });
for (const entry of await readdir(publicDir)) {
  await rm(path.join(publicDir, entry), { recursive: true, force: true });
}

await cp(path.join(workerDir, "../app/dist"), publicDir, { recursive: true });
for (const bundle of ["runtime.js", "download.js"]) {
  await cp(
    path.join(workerDir, "../runtime/dist", bundle),
    path.join(publicDir, bundle),
  );
}
