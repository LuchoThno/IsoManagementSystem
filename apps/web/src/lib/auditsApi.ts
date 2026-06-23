import type { Audit } from '../types/iso';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

type ApiAudit = Omit<Audit, 'date' | 'findings'> & {
  date: string;
  findings: Array<
    Omit<Audit['findings'][number], 'dueDate'> & {
      dueDate: string;
    }
  >;
};

const toAudit = (audit: ApiAudit): Audit => ({
  ...audit,
  date: new Date(audit.date),
  findings: audit.findings.map((finding) => ({
    ...finding,
    dueDate: new Date(finding.dueDate),
  })),
});

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}/iso${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function listAudits(): Promise<Audit[]> {
  const audits = await request<ApiAudit[]>('/audits');
  return audits.map(toAudit);
}

export async function createAuditApi(payload: Omit<Audit, 'id'>): Promise<Audit> {
  const audit = await request<ApiAudit>('/audits', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      date: payload.date.toISOString(),
      findings: payload.findings.map((finding) => ({
        ...finding,
        dueDate: finding.dueDate.toISOString(),
      })),
    }),
  });

  return toAudit(audit);
}

export async function updateAuditApi(
  auditId: string,
  updates: Partial<Omit<Audit, 'id'>>
): Promise<Audit> {
  const audit = await request<ApiAudit>(`/audits/${auditId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      ...updates,
      date: updates.date ? updates.date.toISOString() : undefined,
      findings: updates.findings
        ? updates.findings.map((finding) => ({
            ...finding,
            dueDate: finding.dueDate.toISOString(),
          }))
        : undefined,
    }),
  });

  return toAudit(audit);
}

export async function updateAuditStatusApi(
  auditId: string,
  status: Audit['status']
): Promise<Audit> {
  const audit = await request<ApiAudit>(`/audits/${auditId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

  return toAudit(audit);
}

export async function deleteAuditApi(auditId: string): Promise<void> {
  await request(`/audits/${auditId}/delete`, {
    method: 'PATCH',
  });
}
