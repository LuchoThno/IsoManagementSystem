#!/usr/bin/env node

const args = new Set(process.argv.slice(2));

if (args.has('--help') || args.has('-h')) {
  process.stdout.write(`Usage:
  node scripts/smoke-users-crud.mjs

Environment variables:
  SMOKE_BASE_URL              Base URL to test. Default: http://127.0.0.1:3001
  SMOKE_TIMEOUT_MS            Request timeout in ms. Default: 10000
  SMOKE_ADMIN_TOKEN           Bearer token for an admin user. Required in clerk mode.
  SMOKE_RUN_USER_MUTATIONS    Set to true to actually create/update/delete a test user
  SMOKE_TEST_USER_EMAIL       Email for the disposable test user when mutations are enabled
  SMOKE_TEST_USER_NAME        Display name for the disposable test user. Default: Usuario Smoke
  SMOKE_TEST_USER_PASSWORD    Password for the disposable test user. Required when mutations are enabled

Behavior:
  - Reads /api/iso/auth/config to resolve the auth mode
  - In clerk or demo mode, validates that /api/iso/users is reachable for an admin context
  - If SMOKE_RUN_USER_MUTATIONS=true, performs a controlled create/update/toggle/delete cycle
    against the users CRUD
  - In disabled mode, skips because user administration is intentionally unavailable
`);
  process.exit(0);
}

const baseUrl = (process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '');
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || '10000');
const adminToken = (process.env.SMOKE_ADMIN_TOKEN || '').trim();
const shouldMutate = (process.env.SMOKE_RUN_USER_MUTATIONS || '').trim() === 'true';
const testUserEmail = (process.env.SMOKE_TEST_USER_EMAIL || '').trim().toLowerCase();
const testUserName = (process.env.SMOKE_TEST_USER_NAME || 'Usuario Smoke').trim();
const testUserPassword = (process.env.SMOKE_TEST_USER_PASSWORD || '').trim();

const request = async ({ method, path, token = '', body }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        accept: 'application/json',
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
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
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `No se pudo conectar a ${baseUrl}${path}. Levanta la API y confirma que SMOKE_BASE_URL apunte al backend correcto. Detalle: ${reason}`
    );
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

const assertUserShape = (user, label) => {
  assert(user && typeof user === 'object', `${label} must be a JSON object`);
  assert(typeof user.id === 'string' && user.id.trim(), `${label}.id must be a non-empty string`);
  assert(
    typeof user.email === 'string' && user.email.trim(),
    `${label}.email must be a non-empty string`
  );
  assert(
    ['admin', 'manager', 'auditor', 'viewer'].includes(user.role),
    `${label}.role must be a valid role`
  );
  assert(typeof user.active === 'boolean', `${label}.active must be boolean`);
};

const getAuthConfig = async () => {
  const response = await request({
    method: 'GET',
    path: '/api/iso/auth/config',
  });
  assertStatus(response.status, 200, 'Auth config endpoint');
  assert(response.json && typeof response.json === 'object', 'Auth config must be JSON');
  return response.json;
};

const getUsers = async (token) => {
  const response = await request({
    method: 'GET',
    path: '/api/iso/users',
    token,
  });
  assertStatus(response.status, 200, 'GET /api/iso/users');
  assert(Array.isArray(response.json), 'GET /api/iso/users must return an array');
  return response.json;
};

const run = async () => {
  const authConfig = await getAuthConfig();
  const authMode = authConfig.mode;

  if (authMode === 'disabled') {
    process.stdout.write(
      [
        'Users CRUD smoke skipped.',
        `baseUrl=${baseUrl}`,
        `authMode=${authMode}`,
        'reason=user administration is disabled in this environment',
      ].join('\n') + '\n'
    );
    return;
  }

  if (!adminToken) {
    process.stdout.write(
      [
        'Users CRUD smoke skipped.',
        `baseUrl=${baseUrl}`,
        `authMode=${authMode}`,
        'reason=missing SMOKE_ADMIN_TOKEN',
      ].join('\n') + '\n'
    );
    return;
  }

  const initialUsers = await getUsers(adminToken);

  if (!shouldMutate) {
    process.stdout.write(
      [
        'Users CRUD smoke read checks passed.',
        `baseUrl=${baseUrl}`,
        `authMode=${authMode}`,
        `users=${initialUsers.length}`,
        'mutations=skipped',
      ].join('\n') + '\n'
    );
    return;
  }

  assert(testUserEmail, 'SMOKE_TEST_USER_EMAIL is required when SMOKE_RUN_USER_MUTATIONS=true');
  assert(
    testUserPassword && testUserPassword.length >= 6,
    'SMOKE_TEST_USER_PASSWORD is required and must have at least 6 characters when SMOKE_RUN_USER_MUTATIONS=true'
  );

  const existing = initialUsers.find((user) => user.email?.trim().toLowerCase() === testUserEmail);
  assert(
    !existing,
    `Ya existe un usuario con el correo ${testUserEmail}. Usa un correo desechable distinto para el smoke.`
  );

  let createdUserId = null;

  try {
    const createResponse = await request({
      method: 'POST',
      path: '/api/iso/users',
      token: adminToken,
      body: {
        name: testUserName,
        email: testUserEmail,
        role: 'viewer',
        password: testUserPassword,
        active: true,
      },
    });
    assertStatus(createResponse.status, 201, 'POST /api/iso/users');
    assertUserShape(createResponse.json, 'created user');
    assert(
      createResponse.json.email === testUserEmail,
      `created user email: expected ${testUserEmail}, got ${String(createResponse.json.email)}`
    );
    createdUserId = createResponse.json.id;

    const usersAfterCreate = await getUsers(adminToken);
    const createdInList = usersAfterCreate.find((user) => user.id === createdUserId);
    assert(createdInList, 'Created user must be listed after creation');

    const updateRoleResponse = await request({
      method: 'PATCH',
      path: `/api/iso/users/${createdUserId}`,
      token: adminToken,
      body: {
        name: `${testUserName} Editado`,
        role: 'auditor',
      },
    });
    assertStatus(updateRoleResponse.status, 200, 'PATCH /api/iso/users/:id (role/name)');
    assertUserShape(updateRoleResponse.json, 'updated user');
    assert(
      updateRoleResponse.json.role === 'auditor',
      `updated user role: expected auditor, got ${String(updateRoleResponse.json.role)}`
    );

    const deactivateResponse = await request({
      method: 'PATCH',
      path: `/api/iso/users/${createdUserId}`,
      token: adminToken,
      body: {
        active: false,
      },
    });
    assertStatus(deactivateResponse.status, 200, 'PATCH /api/iso/users/:id (deactivate)');
    assert(
      deactivateResponse.json?.active === false,
      `deactivated user active flag: expected false, got ${String(deactivateResponse.json?.active)}`
    );

    const reactivateResponse = await request({
      method: 'PATCH',
      path: `/api/iso/users/${createdUserId}`,
      token: adminToken,
      body: {
        active: true,
      },
    });
    assertStatus(reactivateResponse.status, 200, 'PATCH /api/iso/users/:id (reactivate)');
    assert(
      reactivateResponse.json?.active === true,
      `reactivated user active flag: expected true, got ${String(reactivateResponse.json?.active)}`
    );

    const deleteResponse = await request({
      method: 'PATCH',
      path: `/api/iso/users/${createdUserId}/delete`,
      token: adminToken,
    });
    assertStatus(deleteResponse.status, 200, 'PATCH /api/iso/users/:id/delete');
    createdUserId = null;

    const usersAfterDelete = await getUsers(adminToken);
    const deletedStillPresent = usersAfterDelete.find(
      (user) => user.email?.trim().toLowerCase() === testUserEmail
    );
    assert(!deletedStillPresent, 'Deleted user must not be listed after deletion');
  } finally {
    if (createdUserId) {
      await request({
        method: 'PATCH',
        path: `/api/iso/users/${createdUserId}/delete`,
        token: adminToken,
      }).catch(() => null);
    }
  }

  process.stdout.write(
    [
      'Users CRUD smoke checks passed.',
      `baseUrl=${baseUrl}`,
      `authMode=${authMode}`,
      'mutations=executed',
      `testUserEmail=${testUserEmail}`,
    ].join('\n') + '\n'
  );
};

run().catch((error) => {
  process.stderr.write(
    `Users CRUD smoke failed: ${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exit(1);
});
