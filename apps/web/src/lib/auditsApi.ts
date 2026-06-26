import type { Audit } from '../types/iso';
import { requestIsoApi } from './isoApiClient';

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

export async function listAudits(): Promise<Audit[]> {
  const audits = await requestIsoApi<ApiAudit[]>('/audits');
  return audits.map(toAudit);
}

export async function createAuditApi(payload: Omit<Audit, 'id'>): Promise<Audit> {
  const audit = await requestIsoApi<ApiAudit>('/audits', {
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
  const audit = await requestIsoApi<ApiAudit>(`/audits/${auditId}`, {
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
  const audit = await requestIsoApi<ApiAudit>(`/audits/${auditId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

  return toAudit(audit);
}

export async function deleteAuditApi(auditId: string): Promise<void> {
  await requestIsoApi(`/audits/${auditId}/delete`, {
    method: 'PATCH',
  });
}
