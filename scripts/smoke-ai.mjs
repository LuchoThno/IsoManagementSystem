#!/usr/bin/env node

const args = new Set(process.argv.slice(2));

if (args.has('--help') || args.has('-h')) {
  process.stdout.write(`Usage:
  node scripts/smoke-ai.mjs

Environment variables:
  SMOKE_BASE_URL        Base URL to test. Default: http://127.0.0.1:3001
  SMOKE_TIMEOUT_MS      Request timeout in ms. Default: 10000
  SMOKE_BEARER_TOKEN    Optional bearer token for authenticated checks in clerk mode

Behavior:
  - Reads /api/iso/auth/config to detect auth mode
  - Verifies IA endpoints reject anonymous access in clerk mode
  - When access is available (demo or clerk + token), fetches a real audit and document
  - Executes summarize-audit, propose-corrective-actions, and analyze-document
  - Verifies stable response shape for the IA sandbox
  - If platform audit logs are readable, verifies IA executions leave audit trail entries
`);
  process.exit(0);
}

const baseUrl = (process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '');
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || '10000');
const bearerToken = (process.env.SMOKE_BEARER_TOKEN || '').trim();

const request = async ({ method = 'GET', path, token = '', body }) => {
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

const assertString = (value, label) => {
  assert(typeof value === 'string' && value.trim().length > 0, `${label} must be a non-empty string`);
};

const assertStringArray = (value, label) => {
  assert(Array.isArray(value), `${label} must be an array`);
  for (let index = 0; index < value.length; index += 1) {
    assertString(value[index], `${label}[${index}]`);
  }
};

const countAiAuditEntries = (logs) =>
  logs.filter((entry) => typeof entry?.action === 'string' && entry.action.startsWith('ai.')).length;

const run = async () => {
  const authConfig = await request({ path: '/api/iso/auth/config' });
  assertStatus(authConfig.status, 200, 'Auth config endpoint');
  const mode = authConfig.json?.mode;
  assert(['clerk', 'demo', 'disabled'].includes(mode), `Unsupported auth mode: ${String(mode)}`);

  if (mode === 'disabled') {
    const disabledResponse = await request({
      method: 'POST',
      path: '/api/iso/ai/summarize-audit',
      body: { auditId: 'disabled-smoke' },
    });
    assertStatus(disabledResponse.status, 503, 'IA endpoint in disabled mode');
    process.stdout.write(`Smoke AI checks passed.\nbaseUrl=${baseUrl}\nauthMode=${mode}\nexecutions=skipped\n`);
    return;
  }

  if (mode === 'clerk') {
    const anonymousResponse = await request({
      method: 'POST',
      path: '/api/iso/ai/summarize-audit',
      body: { auditId: 'anonymous-smoke' },
    });
    assertStatus(anonymousResponse.status, 401, 'Anonymous summarize-audit in clerk mode');
  }

  const runtimeToken = mode === 'clerk' ? bearerToken : '';

  if (mode === 'clerk' && !runtimeToken) {
    process.stdout.write(
      `Smoke AI checks passed.\nbaseUrl=${baseUrl}\nauthMode=${mode}\nexecutions=skipped-no-token\n`
    );
    return;
  }

  const auditLogsBefore = await request({
    path: '/api/iso/platform/audit-logs?limit=50',
    token: runtimeToken,
  });
  const canReadAuditLogs = auditLogsBefore.status === 200 && Array.isArray(auditLogsBefore.json);
  const aiCountBefore = canReadAuditLogs ? countAiAuditEntries(auditLogsBefore.json) : null;

  const auditsResponse = await request({
    path: '/api/iso/audits',
    token: runtimeToken,
  });
  assertStatus(auditsResponse.status, 200, 'List audits for AI smoke');
  assert(Array.isArray(auditsResponse.json), 'Audits response must be an array');
  assert(auditsResponse.json.length > 0, 'AI smoke requires at least one audit');

  const documentsResponse = await request({
    path: '/api/iso/documents',
    token: runtimeToken,
  });
  assertStatus(documentsResponse.status, 200, 'List documents for AI smoke');
  assert(Array.isArray(documentsResponse.json), 'Documents response must be an array');
  assert(documentsResponse.json.length > 0, 'AI smoke requires at least one document');

  const audit = auditsResponse.json[0];
  const document = documentsResponse.json[0];

  assertString(audit.id, 'audit.id');
  assertString(document.id, 'document.id');

  const summarizeResponse = await request({
    method: 'POST',
    path: '/api/iso/ai/summarize-audit',
    token: runtimeToken,
    body: { auditId: audit.id },
  });
  assertStatus(summarizeResponse.status, 201, 'summarize-audit execution');
  assertString(summarizeResponse.json?.id, 'summarize-audit.id');
  assert(summarizeResponse.json?.status === 'success', 'summarize-audit.status must be success');
  assert(summarizeResponse.json?.model === 'stub', 'summarize-audit.model must be stub');
  assertString(summarizeResponse.json?.tenantId, 'summarize-audit.tenantId');
  assert(summarizeResponse.json?.auditId === audit.id, 'summarize-audit.auditId must match selected audit');
  assertString(summarizeResponse.json?.summary, 'summarize-audit.summary');
  assertStringArray(summarizeResponse.json?.keyFindings, 'summarize-audit.keyFindings');

  const actionsResponse = await request({
    method: 'POST',
    path: '/api/iso/ai/propose-corrective-actions',
    token: runtimeToken,
    body: {
      auditId: audit.id,
      riskContext: 'Smoke validation for IA sandbox',
    },
  });
  assertStatus(actionsResponse.status, 201, 'propose-corrective-actions execution');
  assertString(actionsResponse.json?.id, 'propose-corrective-actions.id');
  assert(actionsResponse.json?.status === 'success', 'propose-corrective-actions.status must be success');
  assert(actionsResponse.json?.model === 'stub', 'propose-corrective-actions.model must be stub');
  assertString(actionsResponse.json?.tenantId, 'propose-corrective-actions.tenantId');
  assert(actionsResponse.json?.auditId === audit.id, 'propose-corrective-actions.auditId must match selected audit');
  assertStringArray(actionsResponse.json?.actions, 'propose-corrective-actions.actions');

  const analyzeResponse = await request({
    method: 'POST',
    path: '/api/iso/ai/analyze-document',
    token: runtimeToken,
    body: {
      documentId: document.id,
      focus: 'smoke-validation',
    },
  });
  assertStatus(analyzeResponse.status, 201, 'analyze-document execution');
  assertString(analyzeResponse.json?.id, 'analyze-document.id');
  assert(analyzeResponse.json?.status === 'success', 'analyze-document.status must be success');
  assert(analyzeResponse.json?.model === 'stub', 'analyze-document.model must be stub');
  assertString(analyzeResponse.json?.tenantId, 'analyze-document.tenantId');
  assert(analyzeResponse.json?.documentId === document.id, 'analyze-document.documentId must match selected document');
  assert(Array.isArray(analyzeResponse.json?.sources), 'analyze-document.sources must be an array');
  assert(Array.isArray(analyzeResponse.json?.extractedFacts), 'analyze-document.extractedFacts must be an array');
  assertStringArray(analyzeResponse.json?.generatedProcedures, 'analyze-document.generatedProcedures');
  assertStringArray(
    analyzeResponse.json?.proposedCorrectiveActions,
    'analyze-document.proposedCorrectiveActions'
  );
  assertStringArray(analyzeResponse.json?.recommendations, 'analyze-document.recommendations');

  if (canReadAuditLogs) {
    const auditLogsAfter = await request({
      path: '/api/iso/platform/audit-logs?limit=50',
      token: runtimeToken,
    });
    assertStatus(auditLogsAfter.status, 200, 'Read platform audit logs after IA executions');
    assert(Array.isArray(auditLogsAfter.json), 'Platform audit logs must be an array');

    const aiCountAfter = countAiAuditEntries(auditLogsAfter.json);
    assert(
      aiCountBefore !== null && aiCountAfter >= aiCountBefore + 3,
      `Expected at least 3 additional IA audit entries, got before=${String(aiCountBefore)} after=${String(aiCountAfter)}`
    );
  }

  process.stdout.write(
    [
      'Smoke AI checks passed.',
      `baseUrl=${baseUrl}`,
      `authMode=${mode}`,
      `executions=3`,
      `auditTrail=${canReadAuditLogs ? 'validated' : 'skipped'}`,
    ].join('\n') + '\n'
  );
};

run().catch((error) => {
  process.stderr.write(`Smoke AI failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
