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
  - Verifies selected protected routes reject missing bearer tokens in clerk mode
  - Skips roles whose token is not provided
  - Verifies admin-only, admin-or-manager, admin-or-manager-or-auditor,
    and authenticated-access routes across key domains
  - Verifies auth/access-context resolves the expected role, permission flags,
    and tenant context
  - Includes mutation-route authorization checks using intentionally invalid payloads
    so authorized roles return 400 without mutating real data
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

const expectedAccessContextByRole = {
  admin: {
    role: 'admin',
    permissions: {
      canViewUserDirectory: true,
      canManageUsers: true,
      canViewPlatformAudit: true,
      canViewSecurityPosture: true,
    },
  },
  manager: {
    role: 'manager',
    permissions: {
      canViewUserDirectory: true,
      canManageUsers: false,
      canViewPlatformAudit: false,
      canViewSecurityPosture: false,
    },
  },
  auditor: {
    role: 'auditor',
    permissions: {
      canViewUserDirectory: false,
      canManageUsers: false,
      canViewPlatformAudit: false,
      canViewSecurityPosture: false,
    },
  },
  viewer: {
    role: 'viewer',
    permissions: {
      canViewUserDirectory: false,
      canManageUsers: false,
      canViewPlatformAudit: false,
      canViewSecurityPosture: false,
    },
  },
};

const readRouteMatrix = [
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
    path: '/api/iso/auth/access-context',
    expectedByRole: {
      admin: 200,
      manager: 200,
      auditor: 200,
      viewer: 200,
    },
  },
  {
    path: '/api/iso/tenants/current',
    expectedByRole: {
      admin: 200,
      manager: 200,
      auditor: 200,
      viewer: 200,
    },
  },
  {
    path: '/api/iso/auth/clerk/me',
    expectedByRole: {
      admin: 200,
      manager: 200,
      auditor: 200,
      viewer: 200,
    },
  },
  {
    path: '/api/iso/bootstrap',
    expectedByRole: {
      admin: 200,
      manager: 200,
      auditor: 200,
      viewer: 200,
    },
  },
  {
    path: '/api/iso/bootstrap-shell',
    expectedByRole: {
      admin: 200,
      manager: 200,
      auditor: 200,
      viewer: 200,
    },
  },
  {
    path: '/api/iso/tenants',
    expectedByRole: {
      admin: 200,
      manager: 200,
      auditor: 403,
      viewer: 403,
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
    path: '/api/iso/platform/audit-logs?limit=5',
    expectedByRole: {
      admin: 200,
      manager: 403,
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
  {
    path: '/api/iso/tasks',
    expectedByRole: {
      admin: 200,
      manager: 200,
      auditor: 200,
      viewer: 200,
    },
  },
  {
    path: '/api/iso/audits',
    expectedByRole: {
      admin: 200,
      manager: 200,
      auditor: 200,
      viewer: 200,
    },
  },
  {
    path: '/api/iso/standards',
    expectedByRole: {
      admin: 200,
      manager: 200,
      auditor: 200,
      viewer: 200,
    },
  },
  {
    path: '/api/iso/evidences',
    expectedByRole: {
      admin: 200,
      manager: 200,
      auditor: 200,
      viewer: 200,
    },
  },
  {
    path: '/api/iso/contracts',
    expectedByRole: {
      admin: 200,
      manager: 200,
      auditor: 200,
      viewer: 200,
    },
  },
  {
    path: '/api/iso/corrective-actions',
    expectedByRole: {
      admin: 200,
      manager: 200,
      auditor: 200,
      viewer: 200,
    },
  },
  {
    path: '/api/iso/grc/summary',
    expectedByRole: {
      admin: 200,
      manager: 200,
      auditor: 200,
      viewer: 200,
    },
  },
  {
    path: '/api/iso/calendar/status',
    expectedByRole: {
      admin: 200,
      manager: 200,
      auditor: 200,
      viewer: 200,
    },
  },
  {
    path: '/api/iso/communications/compatibility',
    expectedByRole: {
      admin: 200,
      manager: 200,
      auditor: 200,
      viewer: 200,
    },
  },
];

const mutationRouteMatrix = [
  {
    method: 'POST',
    path: '/api/iso/documents',
    body: {},
    expectedByRole: {
      admin: 400,
      manager: 400,
      auditor: 403,
      viewer: 403,
    },
  },
  {
    method: 'POST',
    path: '/api/iso/tasks',
    body: {},
    expectedByRole: {
      admin: 400,
      manager: 400,
      auditor: 403,
      viewer: 403,
    },
  },
  {
    method: 'POST',
    path: '/api/iso/audits',
    body: {},
    expectedByRole: {
      admin: 400,
      manager: 400,
      auditor: 400,
      viewer: 403,
    },
  },
  {
    method: 'POST',
    path: '/api/iso/standards',
    body: {},
    expectedByRole: {
      admin: 400,
      manager: 400,
      auditor: 403,
      viewer: 403,
    },
  },
  {
    method: 'POST',
    path: '/api/iso/evidences',
    body: {},
    expectedByRole: {
      admin: 400,
      manager: 400,
      auditor: 400,
      viewer: 403,
    },
  },
  {
    method: 'POST',
    path: '/api/iso/contracts',
    body: {},
    expectedByRole: {
      admin: 400,
      manager: 400,
      auditor: 403,
      viewer: 403,
    },
  },
  {
    method: 'POST',
    path: '/api/iso/corrective-actions',
    body: {},
    expectedByRole: {
      admin: 400,
      manager: 400,
      auditor: 400,
      viewer: 403,
    },
  },
  {
    method: 'PUT',
    path: '/api/iso/communications/settings',
    body: {},
    expectedByRole: {
      admin: 400,
      manager: 403,
      auditor: 403,
      viewer: 403,
    },
  },
  {
    method: 'POST',
    path: '/api/iso/communications/templates',
    body: {},
    expectedByRole: {
      admin: 400,
      manager: 400,
      auditor: 403,
      viewer: 403,
    },
  },
  {
    method: 'POST',
    path: '/api/iso/communications/campaigns/send',
    body: {},
    expectedByRole: {
      admin: 400,
      manager: 400,
      auditor: 403,
      viewer: 403,
    },
  },
];

const rbacMatrix = [
  ...readRouteMatrix.map((route) => ({
    method: 'GET',
    ...route,
  })),
  ...mutationRouteMatrix,
];

const request = async (route, token = '') => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${route.path}`, {
      method: route.method,
      headers: {
        accept: 'application/json',
        ...(route.body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      ...(route.body !== undefined ? { body: JSON.stringify(route.body) } : {}),
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

const assertTenantSummary = (tenant, label) => {
  assert(tenant && typeof tenant === 'object', `${label} must be JSON object`);
  assert(typeof tenant.id === 'string' && tenant.id.trim(), `${label}.id must be a non-empty string`);
  assert(typeof tenant.name === 'string' && tenant.name.trim(), `${label}.name must be a non-empty string`);
  assert(typeof tenant.slug === 'string' && tenant.slug.trim(), `${label}.slug must be a non-empty string`);
  assert(
    tenant.status === 'active' || tenant.status === 'inactive',
    `${label}.status must be active or inactive`
  );
};

const assertAccessContext = (role, response) => {
  const expected = expectedAccessContextByRole[role];
  assert(response.json && typeof response.json === 'object', `${role} access-context must be JSON`);
  assert(response.json.mode === 'clerk', `${role} access-context mode: expected clerk, got ${String(response.json?.mode)}`);
  assert(
    response.json.provider === 'clerk',
    `${role} access-context provider: expected clerk, got ${String(response.json?.provider)}`
  );
  assert(response.json.authenticated === true, `${role} access-context authenticated: expected true`);
  assert(
    response.json.capabilities?.directoryProvider === 'clerk',
    `${role} access-context directoryProvider: expected clerk, got ${String(response.json.capabilities?.directoryProvider)}`
  );
  assert(
    response.json.capabilities?.manualUserManagement === false,
    `${role} access-context manualUserManagement: expected false, got ${String(response.json.capabilities?.manualUserManagement)}`
  );
  assert(
    response.json.capabilities?.authenticatedRoutesAvailable === true,
    `${role} access-context authenticatedRoutesAvailable: expected true, got ${String(response.json.capabilities?.authenticatedRoutesAvailable)}`
  );
  assert(response.json.user?.role === expected.role, `${role} access-context user.role: expected ${expected.role}, got ${String(response.json.user?.role)}`);
  assertTenantSummary(response.json.tenant, `${role} access-context tenant`);

  for (const [permission, expectedValue] of Object.entries(expected.permissions)) {
    assert(
      response.json.permissions?.[permission] === expectedValue,
      `${role} access-context permission ${permission}: expected ${String(expectedValue)}, got ${String(response.json.permissions?.[permission])}`
    );
  }
};

const assertCurrentTenant = (role, response) => {
  assert(response.json && typeof response.json === 'object', `${role} current tenant must be JSON`);
  assertTenantSummary(response.json, `${role} current tenant`);
};

const run = async () => {
  const authConfig = await request({ method: 'GET', path: '/api/iso/auth/config' });
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

  let anonymousChecks = 0;

  for (const route of rbacMatrix) {
    const response = await request(route);
    assertStatus(response.status, 401, `anonymous ${route.method} ${route.path}`);
    anonymousChecks += 1;
  }

  const configuredRoles = Object.entries(roleTokens).filter(([, token]) => Boolean(token));
  if (configuredRoles.length === 0) {
    process.stdout.write(
      [
        'RBAC smoke skipped.',
        `baseUrl=${baseUrl}`,
        `authMode=${authMode}`,
        `anonymousChecks=${anonymousChecks}`,
        'reason=no role tokens provided',
      ].join('\n') + '\n'
    );
    return;
  }

  let checks = 0;

  for (const [role, token] of configuredRoles) {
    for (const route of rbacMatrix) {
      const expectedStatus = route.expectedByRole[role];
      const response = await request(route, token);
      assertStatus(response.status, expectedStatus, `${role} ${route.method} ${route.path}`);
      if (route.method === 'GET' && route.path === '/api/iso/auth/access-context') {
        assertAccessContext(role, response);
      }
      if (route.method === 'GET' && route.path === '/api/iso/tenants/current') {
        assertCurrentTenant(role, response);
      }
      checks += 1;
    }
  }

  process.stdout.write(
    [
      'RBAC smoke checks passed.',
      `baseUrl=${baseUrl}`,
      `authMode=${authMode}`,
      `anonymousChecks=${anonymousChecks}`,
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
