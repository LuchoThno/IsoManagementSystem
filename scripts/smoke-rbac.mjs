#!/usr/bin/env node

const args = new Set(process.argv.slice(2));

if (args.has('--help') || args.has('-h')) {
  process.stdout.write(`Usage:
  node scripts/smoke-rbac.mjs

Environment variables:
  SMOKE_BASE_URL             Base URL to test. Default: http://127.0.0.1:3001
  SMOKE_TIMEOUT_MS           Request timeout in ms. Default: 10000
  SMOKE_ADMIN_TOKEN          Bearer token for an admin user
  SMOKE_MANAGER_TOKEN        Bearer token for a manager user
  SMOKE_AUDITOR_TOKEN        Bearer token for an auditor user
  SMOKE_VIEWER_TOKEN         Bearer token for a viewer user

Behavior:
  - Reads /api/iso/auth/config
  - Runs RBAC route checks only when auth mode is clerk
  - Skips roles whose token is not provided
  - Verifies admin-only, admin-or-manager, and authenticated-access routes
`);
  process.exit(0);
}

const baseUrl = (process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '');
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || '10000');

const roleTokens = {
  admin: (process.env.SMOKE_ADMIN_TOKEN || '').trim(),
  manager: (process.env.SMOKE_MANAGER_TOKEN || '').trim(),
  auditor: (process.env.SMOKE_AUDITOR_TOKEN || '').trim(),
  viewer: (process.env.SMOKE_VIEWER_TOKEN || '').trim(),
};

const rbacMatrix = [
  {
    path: '/api/iso/auth/session',
    expectedByRole: {
      admin: 200,
      manager: 200,
      auditor: 200,
      viewer: 200,
    },
  },
  {
    path: '/api/iso/users/clerk',
    expectedByRole: {
      admin: 200,
      manager: 200,
      auditor: 403,
      viewer: 403,
    },
  },
  {
    path: '/api/iso/platform/audit-logs',
    expectedByRole: {
      admin: 200,
      manager: 403,
      auditor: 403,
      viewer: 403,
    },
  },
  {
    path: '/api/iso/security/posture',
    expectedByRole: {
      admin: 200,
      manager: 403,
      auditor: 403,
      viewer: 403,
    },
  },
  {
    path: '/api/iso/documents',
    expectedByRole: {
      admin: 200,
      manager: 200,
      auditor: 200,
      viewer: 200,
    },
  },
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

const assertStatus = (actual, expected, label) => {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
};

const run = async () => {
  const authConfig = await request('/api/iso/auth/config');
  assertStatus(authConfig.status, 200, 'Auth config endpoint');

  const authMode = authConfig.json?.mode;
  if (authMode !== 'clerk') {
    process.stdout.write(
      [
        'RBAC smoke skipped.',
        `baseUrl=${baseUrl}`,
        `authMode=${String(authMode)}`,
        'reason=role validation only applies in clerk mode',
      ].join('\n') + '\n'
    );
    return;
  }

  const configuredRoles = Object.entries(roleTokens).filter(([, token]) => Boolean(token));
  if (configuredRoles.length === 0) {
    process.stdout.write(
      [
        'RBAC smoke skipped.',
        `baseUrl=${baseUrl}`,
        `authMode=${authMode}`,
        'reason=no role tokens provided',
      ].join('\n') + '\n'
    );
    return;
  }

  let checks = 0;

  for (const [role, token] of configuredRoles) {
    for (const route of rbacMatrix) {
      const expectedStatus = route.expectedByRole[role];
      const response = await request(route.path, token);
      assertStatus(response.status, expectedStatus, `${role} ${route.path}`);
      checks += 1;
    }
  }

  process.stdout.write(
    [
      'RBAC smoke checks passed.',
      `baseUrl=${baseUrl}`,
      `authMode=${authMode}`,
      `rolesChecked=${configuredRoles.map(([role]) => role).join(',')}`,
      `checks=${checks}`,
    ].join('\n') + '\n'
  );
};

run().catch((error) => {
  process.stderr.write(
    `RBAC smoke failed: ${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exit(1);
});
