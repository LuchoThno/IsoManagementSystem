#!/usr/bin/env node

const args = new Set(process.argv.slice(2));

if (args.has('--help') || args.has('-h')) {
  process.stdout.write(`Usage:
  node scripts/smoke-api.mjs

Environment variables:
  SMOKE_BASE_URL        Base URL to test. Default: http://127.0.0.1:3001
  SMOKE_AUTH_MODE       Expected auth mode: clerk | demo | disabled
  SMOKE_TIMEOUT_MS      Request timeout in ms. Default: 10000

Behavior:
  - GET /api/health must return 200
  - GET /api/iso/auth/config must return 200 and a valid auth config
  - Auth config must expose provider and capability flags coherently
  - GET /api/iso/bootstrap-shell must match the expected auth behavior:
      clerk    -> 401
      demo     -> 200
      disabled -> 503
`);
  process.exit(0);
}

const baseUrl = (process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '');
const expectedAuthMode = (process.env.SMOKE_AUTH_MODE || '').trim();
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || '10000');

const expectedBootstrapStatusByMode = {
  clerk: 401,
  demo: 200,
  disabled: 503,
};

const expectedProviderByMode = {
  clerk: 'clerk',
  demo: 'demo',
  disabled: 'disabled',
};

const expectedCapabilitiesByMode = {
  clerk: {
    directoryProvider: 'clerk',
    manualUserManagement: false,
    authenticatedRoutesAvailable: true,
  },
  demo: {
    directoryProvider: 'local',
    manualUserManagement: true,
    authenticatedRoutesAvailable: true,
  },
  disabled: {
    directoryProvider: 'none',
    manualUserManagement: false,
    authenticatedRoutesAvailable: false,
  },
};

const request = async (path) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
      },
      signal: controller.signal,
    });

    const text = await response.text();
    let json = null;

    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    return {
      status: response.status,
      ok: response.ok,
      text,
      json,
    };
  } finally {
    clearTimeout(timeout);
  }
};

const assertStatus = (actual, expected, label) => {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const run = async () => {
  const health = await request('/api/health');
  assertStatus(health.status, 200, 'Health endpoint');

  const authConfig = await request('/api/iso/auth/config');
  assertStatus(authConfig.status, 200, 'Auth config endpoint');
  assert(authConfig.json && typeof authConfig.json === 'object', 'Auth config must be JSON');
  assert(
    ['clerk', 'demo', 'disabled'].includes(authConfig.json.mode),
    `Invalid auth mode returned: ${String(authConfig.json?.mode)}`
  );

  const resolvedMode = authConfig.json.mode;
  const modeToCheck = expectedAuthMode || resolvedMode;

  assert(
    Object.prototype.hasOwnProperty.call(expectedBootstrapStatusByMode, modeToCheck),
    `Unsupported auth mode for smoke validation: ${modeToCheck}`
  );
  assert(
    authConfig.json.provider === expectedProviderByMode[modeToCheck],
    `Unexpected auth provider for mode ${modeToCheck}: ${String(authConfig.json.provider)}`
  );
  assert(
    authConfig.json.capabilities &&
      typeof authConfig.json.capabilities === 'object',
    'Auth config must expose capabilities'
  );
  assert(
    authConfig.json.capabilities.directoryProvider ===
      expectedCapabilitiesByMode[modeToCheck].directoryProvider,
    `Unexpected directoryProvider for mode ${modeToCheck}: ${String(authConfig.json.capabilities?.directoryProvider)}`
  );
  assert(
    authConfig.json.capabilities.manualUserManagement ===
      expectedCapabilitiesByMode[modeToCheck].manualUserManagement,
    `Unexpected manualUserManagement for mode ${modeToCheck}: ${String(authConfig.json.capabilities?.manualUserManagement)}`
  );
  assert(
    authConfig.json.capabilities.authenticatedRoutesAvailable ===
      expectedCapabilitiesByMode[modeToCheck].authenticatedRoutesAvailable,
    `Unexpected authenticatedRoutesAvailable for mode ${modeToCheck}: ${String(authConfig.json.capabilities?.authenticatedRoutesAvailable)}`
  );

  const bootstrapShell = await request('/api/iso/bootstrap-shell');
  assertStatus(
    bootstrapShell.status,
    expectedBootstrapStatusByMode[modeToCheck],
    'Bootstrap shell auth behavior'
  );

  process.stdout.write(
    [
      'Smoke API checks passed.',
      `baseUrl=${baseUrl}`,
      `authMode=${resolvedMode}`,
      `bootstrapShellStatus=${bootstrapShell.status}`,
    ].join('\n') + '\n'
  );
};

run().catch((error) => {
  process.stderr.write(`Smoke API failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
