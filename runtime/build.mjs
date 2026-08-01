import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");

const ctx = await esbuild.context({
  entryPoints: ["src/index.ts"],
  outfile: "dist/runtime.js",
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  legalComments: "none",
});

if (watch) {
  await ctx.watch();
  console.log("watching for changes...");
} else {
  await ctx.rebuild();
  await ctx.dispose();
}
