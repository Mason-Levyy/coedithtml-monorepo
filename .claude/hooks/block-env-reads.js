#!/usr/bin/env node
'use strict';

const fs = require('fs');

function readStdin() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8'));
  } catch {
    return {};
  }
}

const ALLOWED_ENV_SUFFIX = /\.env\.(example|sample|template)$/i;
const ENV_PATH = /(^|[\\/])\.env(\.[^\\/]+)?$/i;

function isBlockedEnvPath(p) {
  if (!p || typeof p !== 'string') return false;
  const normalized = p.replace(/\\/g, '/');
  if (ALLOWED_ENV_SUFFIX.test(normalized)) return false;
  return ENV_PATH.test(normalized);
}

const READS_ENV_FILE = /(cat|type|less|more|head|tail|get-content|gc)\s+[^\n]*\.env(\.[a-z0-9_-]+)?(\s|$|["'])/i;
const ALLOWED_ENV_MENTION = /\.env\.(example|sample|template)/i;

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    }),
  );
}

const REASON =
  'Reading .env files is blocked (CLAUDE.md: secrets live in Worker environment bindings, never read a secret in client code or into this transcript). Ask the user for the specific value you need, or read .env.example for the shape.';

function main() {
  const input = readStdin();
  const tool = input?.tool_name;

  if (tool === 'Read') {
    const file = input?.tool_input?.file_path;
    if (isBlockedEnvPath(file)) deny(REASON);
    return;
  }

  if (tool === 'Bash' || tool === 'PowerShell') {
    const cmd = input?.tool_input?.command;
    if (typeof cmd !== 'string') return;
    if (READS_ENV_FILE.test(cmd) && !ALLOWED_ENV_MENTION.test(cmd)) {
      deny(REASON);
    }
  }
}

main();
