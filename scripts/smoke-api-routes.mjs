#!/usr/bin/env node

const args = new Set(process.argv.slice(2));

if (args.has('--help') || args.has('-h')) {
  process.stdout.write(`Usage:
  node scripts/smoke-api-routes.mjs

Environment variables:
  SMOKE_BASE_URL        Base URL to test. Default: http://127.0.0.1:3001
  SMOKE_AUTH_MODE       Expected auth mode: clerk | demo | disabled
  SMOKE_TIMEOUT_MS      Request timeout in ms. Default: 10000
  SMOKE_BEARER_TOKEN    Optional bearer token for authenticated checks

Behavior:
  - Validates public routes
  - Validates protected route behavior by auth mode
  - Includes access-context, user-directory, and platform-audit route checks
  - If SMOKE_BEARER_TOKEN is provided, validates selected authenticated routes return 200
`);
  process.exit(0);
}

const baseUrl = (process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '');
const expectedAuthMode = (process.env.SMOKE_AUTH_MODE || '').trim();
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || '10000');
const bearerToken = (process.env.SMOKE_BEARER_TOKEN || '').trim();

const protectedStatusByMode = {
  clerk: 401,
  demo: 200,
  disabled: 503,
};

const publicRoutes = [
  { path: '/api/health', expected: 200 },
  { path: '/api/iso/auth/config', expected: 200 },
];

const protectedRoutes = [
  '/api/iso/bootstrap-shell',
  '/api/iso/auth/access-context',
  '/api/iso/tenants/current',
  '/api/iso/auth/session',
  '/api/iso/documents',
  '/api/iso/tasks',
  '/api/iso/audits',
  '/api/iso/security/posture',
  '/api/iso/users/clerk',
  '/api/iso/platform/audit-logs?limit=5',
  '/api/iso/standards',
  '/api/iso/communications/compatibility',
  '/api/iso/calendar/status',
];

const authenticatedRoutes = [
  '/api/iso/bootstrap-shell',
  '/api/iso/auth/access-context',
  '/api/iso/tenants/current',
  '/api/iso/auth/session',
  '/api/iso/documents',
  '/api/iso/tasks',
  '/api/iso/audits',
];

const request = async (path, token = '') => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
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

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const assertStatus = (actual, expected, label) => {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
};

const run = async () => {
  for (const route of publicRoutes) {
    const response = await request(route.path);
    assertStatus(response.status, route.expected, `Public route ${route.path}`);
  }

  const authConfig = await request('/api/iso/auth/config');
  const resolvedMode = authConfig.json?.mode;
  const modeToCheck = expectedAuthMode || resolvedMode;

  assert(
    ['clerk', 'demo', 'disabled'].includes(modeToCheck),
    `Unsupported auth mode for route smoke validation: ${String(modeToCheck)}`
  );

  for (const path of protectedRoutes) {
    const response = await request(path);
    assertStatus(
      response.status,
      protectedStatusByMode[modeToCheck],
      `Protected route ${path}`
    );
  }

  if (bearerToken) {
    for (const path of authenticatedRoutes) {
      const response = await request(path, bearerToken);
      assertStatus(response.status, 200, `Authenticated route ${path}`);
    }
  }

  process.stdout.write(
    [
      'Smoke API route checks passed.',
      `baseUrl=${baseUrl}`,
      `authMode=${modeToCheck}`,
      `authenticatedChecks=${bearerToken ? 'enabled' : 'skipped'}`,
    ].join('\n') + '\n'
  );
};

run().catch((error) => {
  process.stderr.write(
    `Smoke API routes failed: ${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exit(1);
});
