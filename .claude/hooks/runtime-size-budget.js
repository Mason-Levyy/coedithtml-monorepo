#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function readStdin() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8'));
  } catch {
    return {};
  }
}

function block(reason) {
  process.stdout.write(JSON.stringify({ decision: 'block', reason }));
}

function main() {
  const input = readStdin();
  const file = input?.tool_input?.file_path || input?.tool_response?.filePath;
  if (!file) return;

  const root = process.cwd();
  // Match on the path relative to the repo so an edit outside it never starts a
  // build here — a scratch file under some other .../runtime/ would otherwise
  // trigger one.
  const rel = path.relative(root, file);
  if (rel === '' || path.isAbsolute(rel) || rel.startsWith('..' + path.sep)) return;
  if (!rel.replace(/\\/g, '/').startsWith('runtime/')) return;

  const runtimeDir = path.join(root, 'runtime');
  const runtimePkgPath = path.join(runtimeDir, 'package.json');
  if (!fs.existsSync(runtimePkgPath)) return; // runtime/ not scaffolded yet

  let runtimePkg;
  try {
    runtimePkg = JSON.parse(fs.readFileSync(runtimePkgPath, 'utf8'));
  } catch {
    return;
  }
  if (!runtimePkg.scripts || !runtimePkg.scripts.build) return;

  // pnpm resolves to a .CMD shim on Windows, which Node can only launch via a
  // shell. `pnpm` must stay unquoted: cmd.exe sets %0 to the literal token, so
  // a quoted name leaves %~dp0 with no directory part and the shim resolves
  // pnpm.mjs against the cwd instead of its install dir.
  try {
    execSync('pnpm --filter runtime build', {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    const out = [err.stdout, err.stderr].filter(Boolean).join('\n').trim() || err.message;
    block(`runtime/ build failed:\n${out}`);
    return;
  }

  // Bundle location/naming is a placeholder (dist/*.js) until the runtime
  // package picks its actual bundler and output convention — update this
  // once that's decided.
  const distDir = path.join(runtimeDir, 'dist');
  if (!fs.existsSync(distDir)) return;

  const jsFiles = fs.readdirSync(distDir).filter((f) => f.endsWith('.js'));
  if (jsFiles.length === 0) return;

  const LIMIT_BYTES = 32 * 1024;
  const oversized = jsFiles
    .map((f) => ({ f, size: fs.statSync(path.join(distDir, f)).size }))
    .filter(({ size }) => size > LIMIT_BYTES);

  if (oversized.length > 0) {
    const detail = oversized.map(({ f, size }) => `  ${f}: ${(size / 1024).toFixed(1)}KB`).join('\n');
    block(
      `runtime/ bundle exceeds the 32KB minified budget (CLAUDE.md):\n${detail}\nReduce bundle size or justify the increase in the PR.`,
    );
  }
}

main();
