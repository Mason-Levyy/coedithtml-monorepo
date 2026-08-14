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
  const rel = path.relative(root, file);
  if (rel === '' || path.isAbsolute(rel) || rel.startsWith('..' + path.sep)) return;
  if (!rel.replace(/\\/g, '/').startsWith('runtime/')) return;

  const runtimeDir = path.join(root, 'runtime');
  const runtimePkgPath = path.join(runtimeDir, 'package.json');
  if (!fs.existsSync(runtimePkgPath)) return;

  let runtimePkg;
  try {
    runtimePkg = JSON.parse(fs.readFileSync(runtimePkgPath, 'utf8'));
  } catch {
    return;
  }
  if (!runtimePkg.scripts || !runtimePkg.scripts.build) return;

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

  // The per-bundle budgets live in check-bundle-size.mjs, which CI runs too.
  // A second copy of the numbers here is how the two quietly disagree.
  try {
    execSync('pnpm --filter runtime check-size', {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    const out = [err.stdout, err.stderr].filter(Boolean).join('\n').trim() || err.message;
    block(out);
  }
}

main();
