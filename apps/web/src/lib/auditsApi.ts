import type { Audit, AuditExecutionReport, ExportValidation } from '../types/iso';
import { requestIsoApi } from './isoApiClient';

export type AuditUpsertPayload = Omit<Audit, 'id'> & {
  changeSummary?: string;
};

export type ApiAudit = Omit<Audit, 'date' | 'findings' | 'changeLog'> & {
  date: string;
  findings: Array<
    Omit<Audit['findings'][number], 'dueDate'> & {
      dueDate: string;
    }
  >;
  changeLog?: Array<
    Omit<NonNullable<Audit['changeLog']>[number], 'date'> & {
      date: string;
    }
  >;
};

export const toAudit = (audit: ApiAudit): Audit => ({
  ...audit,
  date: new Date(audit.date),
  findings: audit.findings.map((finding) => ({
    ...finding,
    dueDate: new Date(finding.dueDate),
  })),
  changeLog: (audit.changeLog ?? []).map((entry) => ({
    ...entry,
    date: new Date(entry.date),
  })),
});

type ApiAuditExecutionReportBundle = {
  report: {
    evidences: Array<
      Omit<AuditExecutionReport['evidences'][number], 'dueDate' | 'collectedAt' | 'createdAt' | 'updatedAt'> & {
        dueDate: string | null;
        collectedAt: string | null;
        createdAt: string;
        updatedAt: string;
        activityLog?: Array<
          Omit<NonNullable<AuditExecutionReport['evidences'][number]['activityLog']>[number], 'date'> & {
            date: string;
          }
        >;
      }
    >;
    tasks: Array<Omit<AuditExecutionReport['tasks'][number], 'dueDate'> & { dueDate: string }>;
  };
  validation: ExportValidation;
  audit: ApiAudit;
};

const toEvidence = (
  evidence: ApiAuditExecutionReportBundle['report']['evidences'][number]
) => ({
  ...evidence,
  dueDate: evidence.dueDate ? new Date(evidence.dueDate) : null,
  collectedAt: evidence.collectedAt ? new Date(evidence.collectedAt) : null,
  activityLog: (evidence.activityLog ?? []).map((entry) => ({
    ...entry,
    date: new Date(entry.date),
  })),
  createdAt: new Date(evidence.createdAt),
  updatedAt: new Date(evidence.updatedAt),
});

export async function listAudits(): Promise<Audit[]> {
  const audits = await requestIsoApi<ApiAudit[]>('/audits');
  return audits.map(toAudit);
}

export async function createAuditApi(payload: AuditUpsertPayload): Promise<Audit> {
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

export async function updateAuditApi(auditId: string, updates: Partial<AuditUpsertPayload>): Promise<Audit> {
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

export async function fetchAuditExportBundle(auditId: string): Promise<{
  audit: Audit;
  report: AuditExecutionReport;
  validation: ExportValidation;
}> {
  const bundle = await requestIsoApi<ApiAuditExecutionReportBundle>(`/audits/${auditId}/export`, {
    method: 'POST',
  });

  return {
    audit: toAudit(bundle.audit),
    report: {
      evidences: bundle.report.evidences.map(toEvidence),
      tasks: bundle.report.tasks.map((task) => ({
        ...task,
        dueDate: new Date(task.dueDate),
      })),
    },
    validation: bundle.validation,
  };
}
