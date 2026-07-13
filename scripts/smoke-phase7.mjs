#!/usr/bin/env node

import { spawn } from 'node:child_process';

const args = process.argv.slice(2);

const hasFlag = (flag) => args.includes(flag);
const getArgValue = (flag) => {
  const index = args.indexOf(flag);
  if (index === -1) {
    return null;
  }

  return args[index + 1] ?? null;
};

if (hasFlag('--help') || hasFlag('-h')) {
  process.stdout.write(`Usage:
  node scripts/smoke-phase7.mjs [--base-url <url>] [--auth-mode <mode>] [--down] [--skip-build] [--skip-socket]

Environment variables:
  SMOKE_BASE_URL        Base URL for the API. Default: http://127.0.0.1:3001
  SMOKE_AUTH_MODE       Expected auth mode. Default: demo
  SMOKE_BEARER_TOKEN    Optional token for smoke:ai in clerk mode
  SMOKE_ADMIN_TOKEN     Optional token for smoke:rbac
  SMOKE_MANAGER_TOKEN   Optional token for smoke:rbac
  SMOKE_AUDITOR_TOKEN   Optional token for smoke:rbac
  SMOKE_VIEWER_TOKEN    Optional token for smoke:rbac
  SMOKE_SOCKET_URL      Optional socket URL override

Behavior:
  - Runs the stack smoke for API plus socket checks
  - Executes smoke:ai against the active stack
  - Executes smoke:rbac only when at least one role token is present
  - Intended as the single command for closing Fase 7
`);
  process.exit(0);
}

const baseUrl = (getArgValue('--base-url') || process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '');
const authMode = (getArgValue('--auth-mode') || process.env.SMOKE_AUTH_MODE || 'demo').trim();
const shouldDown = hasFlag('--down');
const skipBuild = hasFlag('--skip-build');
const skipSocket = hasFlag('--skip-socket');

const hasAnyRbacToken = [
  process.env.SMOKE_ADMIN_TOKEN,
  process.env.SMOKE_MANAGER_TOKEN,
  process.env.SMOKE_AUDITOR_TOKEN,
  process.env.SMOKE_VIEWER_TOKEN,
].some((value) => typeof value === 'string' && value.trim().length > 0);

const inheritedEnv = {
  ...process.env,
  SMOKE_BASE_URL: baseUrl,
  SMOKE_AUTH_MODE: authMode,
};

const run = (command, commandArgs, env = inheritedEnv) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: process.cwd(),
      env,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${commandArgs.join(' ')} failed with exit code ${String(code)}`));
    });
  });

const main = async () => {
  const stackArgs = ['scripts/smoke-stack.mjs', '--base-url', baseUrl, '--auth-mode', authMode];

  if (shouldDown) {
    stackArgs.push('--down');
  }

  if (skipBuild) {
    stackArgs.push('--skip-build');
  }

  if (skipSocket) {
    stackArgs.push('--skip-socket');
  }

  await run('node', stackArgs);
  await run('node', ['scripts/smoke-ai.mjs']);

  if (authMode === 'clerk' && hasAnyRbacToken) {
    await run('node', ['scripts/smoke-rbac.mjs']);
  }

  process.stdout.write(
    [
      'Smoke Fase 7 checks passed.',
      `baseUrl=${baseUrl}`,
      `authMode=${authMode}`,
      `rbac=${authMode === 'clerk' ? (hasAnyRbacToken ? 'validated' : 'skipped-no-tokens') : 'not-applicable'}`,
      `cleanup=${shouldDown ? 'down' : 'left-running'}`,
    ].join('\n') + '\n'
  );
};

main().catch((error) => {
  process.stderr.write(
    `Smoke Fase 7 failed: ${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exit(1);
});
