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

const NPM_YARN_AT_COMMAND_POSITION = /(^|[;&|(`]\s*)(npm|yarn)(\.cmd|\.exe)?(\s|$)/i;

function main() {
  const input = readStdin();
  if (input?.tool_name !== 'Bash' && input?.tool_name !== 'PowerShell') return;

  const cmd = input?.tool_input?.command;
  if (typeof cmd !== 'string') return;

  if (NPM_YARN_AT_COMMAND_POSITION.test(cmd)) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason:
            'This is a pnpm-only workspace (CLAUDE.md) — a stray npm/yarn lockfile breaks the build. Use the equivalent pnpm command instead (pnpm install, pnpm add, pnpm run <script>, pnpm exec <bin>).',
        },
      }),
    );
  }
}

main();
