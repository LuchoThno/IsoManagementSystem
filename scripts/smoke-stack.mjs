#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const args = process.argv.slice(2);

const getArgValue = (flag) => {
  const index = args.indexOf(flag);
  if (index === -1) {
    return null;
  }

  return args[index + 1] ?? null;
};

const hasFlag = (flag) => args.includes(flag);

if (hasFlag('--help') || hasFlag('-h')) {
  process.stdout.write(`Usage:
  node scripts/smoke-stack.mjs [--compose-file <path>] [--env-file <path>] [--base-url <url>] [--auth-mode <mode>] [--wait-ms <ms>] [--poll-ms <ms>] [--skip-build] [--skip-socket] [--down]

Environment variables:
  SMOKE_BASE_URL        Base URL for HTTP smokes. Default: http://127.0.0.1:${process.env.API_PORT || '3000'}
  SMOKE_AUTH_MODE       Expected auth mode: clerk | demo | disabled. Default: demo
  SMOKE_TIMEOUT_MS      Request timeout for smoke scripts. Default: 10000
  SMOKE_SOCKET_URL      Socket.IO URL. Default: derived from SMOKE_BASE_URL
  SMOKE_BEARER_TOKEN    Optional bearer token for authenticated route checks

Behavior:
  - Runs docker compose up for docker-compose.api.yml
  - Forces APP_AUTH_MODE for the temporary compose run
  - Aligns API_PORT with the port declared in SMOKE_BASE_URL when possible
  - Waits until /api/health returns 200
  - Executes smoke-api, smoke-api-routes, and optionally smoke-socket
  - Optionally runs docker compose down at the end when --down is provided
`);
  process.exit(0);
}

const composeFile = resolve(getArgValue('--compose-file') || 'docker-compose.api.yml');
const envFile = getArgValue('--env-file');
const defaultBaseUrl = `http://127.0.0.1:${process.env.API_PORT || '3000'}`;
const baseUrl = (getArgValue('--base-url') || process.env.SMOKE_BASE_URL || defaultBaseUrl).replace(/\/+$/, '');
const authMode = (getArgValue('--auth-mode') || process.env.SMOKE_AUTH_MODE || 'demo').trim();
const waitMs = Number(getArgValue('--wait-ms') || '120000');
const pollMs = Number(getArgValue('--poll-ms') || '2000');
const skipBuild = hasFlag('--skip-build');
const skipSocket = hasFlag('--skip-socket');
const shouldDown = hasFlag('--down');
const resolvedBaseUrl = new URL(baseUrl);
const resolvedApiPort =
  resolvedBaseUrl.port || (resolvedBaseUrl.protocol === 'https:' ? '443' : '80');

const composeArgsBase = ['compose', '-f', composeFile];
if (envFile) {
  composeArgsBase.push('--env-file', resolve(envFile));
}

const composeEnv = {
  ...process.env,
  APP_AUTH_MODE: authMode,
  API_PORT: resolvedApiPort,
};

const smokeEnv = {
  ...process.env,
  SMOKE_BASE_URL: baseUrl,
  SMOKE_AUTH_MODE: authMode,
  SMOKE_SOCKET_URL:
    process.env.SMOKE_SOCKET_URL || `${baseUrl}/socket.io/?EIO=4&transport=polling`,
};

const run = (command, commandArgs, options = {}) =>
  new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, commandArgs, {
      cwd: options.cwd ?? process.cwd(),
      env: options.env ?? process.env,
      stdio: options.stdio ?? 'inherit',
    });

    child.on('error', rejectPromise);
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(
        new Error(`${command} ${commandArgs.join(' ')} failed with exit code ${String(code)}`)
      );
    });
  });

const canReachDockerDaemon = () =>
  new Promise((resolvePromise) => {
    const child = spawn('docker', ['info'], {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'ignore',
    });

    child.on('error', () => resolvePromise(false));
    child.on('close', (code) => resolvePromise(code === 0));
  });

const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

const waitForHealth = async () => {
  const deadline = Date.now() + waitMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health`, {
        method: 'GET',
        headers: { accept: 'application/json' },
      });

      if (response.status === 200) {
        return;
      }
    } catch {
      // Keep polling until the API responds.
    }

    await sleep(pollMs);
  }

  throw new Error(`Timed out waiting for ${baseUrl}/api/health after ${waitMs}ms`);
};

const upArgs = [...composeArgsBase, 'up', '-d', ...(skipBuild ? [] : ['--build'])];
const downArgs = [...composeArgsBase, 'down'];

const main = async () => {
  if (!(await canReachDockerDaemon())) {
    throw new Error(
      'Docker daemon unavailable. Inicia Docker Desktop o habilita el daemon antes de ejecutar este smoke.'
    );
  }

  await run('docker', upArgs, { env: composeEnv });
  await waitForHealth();
  await run('node', ['scripts/smoke-api.mjs'], { env: smokeEnv });
  await run('node', ['scripts/smoke-api-routes.mjs'], { env: smokeEnv });

  if (!skipSocket) {
    await run('node', ['scripts/smoke-socket.mjs'], { env: smokeEnv });
  }

  if (shouldDown) {
    await run('docker', downArgs, { env: composeEnv });
  }

  process.stdout.write(
    [
      'Smoke stack checks passed.',
      `composeFile=${composeFile}`,
      `baseUrl=${baseUrl}`,
      `authMode=${authMode}`,
      `apiPort=${resolvedApiPort}`,
      `socketCheck=${skipSocket ? 'skipped' : 'enabled'}`,
      `cleanup=${shouldDown ? 'down' : 'left-running'}`,
    ].join('\n') + '\n'
  );
};

main().catch(async (error) => {
  if (shouldDown) {
    try {
      await run('docker', downArgs, { env: composeEnv });
    } catch {
      // Preserve the original failure and avoid masking it with cleanup issues.
    }
  }

  process.stderr.write(
    `Smoke stack failed: ${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exit(1);
});
