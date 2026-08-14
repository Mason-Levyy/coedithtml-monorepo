import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");

const bundles = [
  { entryPoints: ["src/main.ts"], outfile: "dist/runtime.js" },
  { entryPoints: ["src/author/main.ts"], outfile: "dist/author.js" },
  { entryPoints: ["src/download/main.ts"], outfile: "dist/download.js" },
];

const contexts = await Promise.all(
  bundles.map((bundle) =>
    esbuild.context({
      ...bundle,
      bundle: true,
      minify: true,
      format: "iife",
      target: "es2020",
      legalComments: "none",
    }),
  ),
);

if (watch) {
  await Promise.all(contexts.map((ctx) => ctx.watch()));
  console.log("watching for changes...");
} else {
  await Promise.all(contexts.map((ctx) => ctx.rebuild()));
  await Promise.all(contexts.map((ctx) => ctx.dispose()));
}
