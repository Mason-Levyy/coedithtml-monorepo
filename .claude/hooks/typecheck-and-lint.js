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

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function hasEslintConfig(root) {
  const candidates = [
    'eslint.config.js',
    'eslint.config.mjs',
    'eslint.config.cjs',
    'eslint.config.ts',
    '.eslintrc.js',
    '.eslintrc.cjs',
    '.eslintrc.json',
    '.eslintrc.yml',
    '.eslintrc.yaml',
  ];
  return candidates.some((c) => isFile(path.join(root, c)));
}

// pnpm resolves to a .CMD shim on Windows, which Node can only launch via a
// shell — so args are quoted here rather than relying on execFileSync's
// array+shell:true (which concatenates unescaped and is unsafe/deprecated).
function shQuote(arg) {
  return '"' + String(arg).replace(/"/g, '""') + '"';
}

function run(args, cwd) {
  const command = ['pnpm', ...args].map(shQuote).join(' ');
  try {
    execSync(command, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return null;
  } catch (err) {
    return [err.stdout, err.stderr].filter(Boolean).join('\n').trim() || err.message;
  }
}

function main() {
  const input = readStdin();
  const file = input?.tool_input?.file_path || input?.tool_response?.filePath;
  if (!file || !isFile(file)) return;
  if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(file)) return;

  const root = process.cwd();
  const pkgPath = path.join(root, 'package.json');
  if (!isFile(pkgPath)) return; // workspace not scaffolded yet

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  } catch {
    return;
  }

  const failures = [];

  if (pkg.scripts && pkg.scripts.typecheck) {
    const err = run(['typecheck'], root);
    if (err) failures.push(`pnpm typecheck failed:\n${err}`);
  }

  if (hasEslintConfig(root)) {
    const err = run(['exec', 'eslint', '--fix', file], root);
    if (err) failures.push(`eslint --fix failed on ${file}:\n${err}`);
  }

  if (failures.length > 0) {
    process.stdout.write(JSON.stringify({ decision: 'block', reason: failures.join('\n\n') }));
  }
}

main();
