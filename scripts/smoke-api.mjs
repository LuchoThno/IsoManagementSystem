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
  - GET /api/iso/auth/access-context must match the expected auth behavior
    and expose coherent permissions and tenant context when available
  - GET /api/iso/tenants/current must match the expected auth behavior
    and expose a coherent tenant summary when available
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

const expectedAccessContextStatusByMode = {
  clerk: 401,
  demo: 200,
  disabled: 503,
};

const expectedCurrentTenantStatusByMode = {
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

const expectedPermissionsByMode = {
  demo: {
    canViewUserDirectory: false,
    canManageUsers: true,
    canViewPlatformAudit: false,
    canViewSecurityPosture: false,
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

const assertTenantSummary = (tenant, label) => {
  assert(tenant && typeof tenant === 'object', `${label} must be an object`);
  assert(typeof tenant.id === 'string' && tenant.id.trim(), `${label}.id must be a non-empty string`);
  assert(typeof tenant.name === 'string' && tenant.name.trim(), `${label}.name must be a non-empty string`);
  assert(typeof tenant.slug === 'string' && tenant.slug.trim(), `${label}.slug must be a non-empty string`);
  assert(
    tenant.status === 'active' || tenant.status === 'inactive',
    `${label}.status must be active or inactive`
  );
  assert(typeof tenant.timezone === 'string' && tenant.timezone.trim(), `${label}.timezone must be a non-empty string`);
  assert(
    typeof tenant.defaultLanguage === 'string' && tenant.defaultLanguage.trim(),
    `${label}.defaultLanguage must be a non-empty string`
  );
  assert(typeof tenant.isDefault === 'boolean', `${label}.isDefault must be boolean`);
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

  const accessContext = await request('/api/iso/auth/access-context');
  assertStatus(
    accessContext.status,
    expectedAccessContextStatusByMode[modeToCheck],
    'Access context auth behavior'
  );

  const currentTenant = await request('/api/iso/tenants/current');
  assertStatus(
    currentTenant.status,
    expectedCurrentTenantStatusByMode[modeToCheck],
    'Current tenant auth behavior'
  );

  if (accessContext.status === 200) {
    assert(accessContext.json && typeof accessContext.json === 'object', 'Access context must be JSON');
    assert(
      accessContext.json.mode === modeToCheck,
      `Unexpected access-context mode for ${modeToCheck}: ${String(accessContext.json?.mode)}`
    );
    assert(
      accessContext.json.provider === expectedProviderByMode[modeToCheck],
      `Unexpected access-context provider for ${modeToCheck}: ${String(accessContext.json?.provider)}`
    );
    assert(
      accessContext.json.capabilities?.directoryProvider ===
        expectedCapabilitiesByMode[modeToCheck].directoryProvider,
      `Unexpected access-context directoryProvider for ${modeToCheck}: ${String(accessContext.json.capabilities?.directoryProvider)}`
    );
    assert(
      accessContext.json.capabilities?.manualUserManagement ===
        expectedCapabilitiesByMode[modeToCheck].manualUserManagement,
      `Unexpected access-context manualUserManagement for ${modeToCheck}: ${String(accessContext.json.capabilities?.manualUserManagement)}`
    );
    assert(
      accessContext.json.capabilities?.authenticatedRoutesAvailable ===
        expectedCapabilitiesByMode[modeToCheck].authenticatedRoutesAvailable,
      `Unexpected access-context authenticatedRoutesAvailable for ${modeToCheck}: ${String(accessContext.json.capabilities?.authenticatedRoutesAvailable)}`
    );

    if (expectedPermissionsByMode[modeToCheck]) {
      for (const [permission, expectedValue] of Object.entries(expectedPermissionsByMode[modeToCheck])) {
        assert(
          accessContext.json.permissions?.[permission] === expectedValue,
          `Unexpected access-context permission ${permission} for ${modeToCheck}: ${String(accessContext.json.permissions?.[permission])}`
        );
      }
    }

    assertTenantSummary(accessContext.json.tenant, 'access-context tenant');
  }

  if (currentTenant.status === 200) {
    assertTenantSummary(currentTenant.json, 'current tenant');

    if (accessContext.status === 200) {
      assert(
        currentTenant.json.id === accessContext.json?.tenant?.id,
        `Current tenant id must match access-context tenant id: ${String(currentTenant.json.id)} vs ${String(accessContext.json?.tenant?.id)}`
      );
    }
  }

  process.stdout.write(
    [
      'Smoke API checks passed.',
      `baseUrl=${baseUrl}`,
      `authMode=${resolvedMode}`,
      `accessContextStatus=${accessContext.status}`,
      `currentTenantStatus=${currentTenant.status}`,
      `bootstrapShellStatus=${bootstrapShell.status}`,
    ].join('\n') + '\n'
  );
};

run().catch((error) => {
  process.stderr.write(`Smoke API failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
