import type {
  AuditExecutionReport,
  Evidence,
  PaginatedResult,
  StandardStructure,
  StandardSummary,
} from '../types/iso';
import { requestIsoApi } from './isoApiClient';

type ApiStandardSummary = Omit<StandardSummary, 'publishedAt' | 'createdAt' | 'updatedAt'> & {
  publishedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
  metrics?: {
    requirementsCount: number;
    evidencedCount: number;
    complianceRate: number;
  };
};

type ApiStandardStructure = Omit<StandardStructure, 'standard'> & {
  standard: ApiStandardSummary;
};

type ApiEvidence = Omit<Evidence, 'dueDate' | 'collectedAt' | 'createdAt' | 'updatedAt'> & {
  dueDate: string | null;
  collectedAt: string | null;
  createdAt: string;
  updatedAt: string;
  activityLog?: Array<
    Omit<NonNullable<Evidence['activityLog']>[number], 'date'> & {
      date: string;
    }
  >;
};

type ApiAuditExecutionReport = {
  evidences: ApiEvidence[];
  tasks: Array<Omit<AuditExecutionReport['tasks'][number], 'dueDate'> & { dueDate: string }>;
};

export type StandardEditorRequirement = {
  code: string;
  title: string;
  description?: string;
  intent?: string;
  criticality?: 'low' | 'medium' | 'high';
  status?: 'draft' | 'active' | 'obsolete';
};

export type StandardEditorClause = {
  code: string;
  title: string;
  description?: string;
  children?: StandardEditorClause[];
  requirements?: StandardEditorRequirement[];
};

export type StandardEditorPayload = {
  code: string;
  title: string;
  description?: string;
  category?: 'standard' | 'framework' | 'regulation' | 'contractual';
  status?: 'draft' | 'active' | 'archived';
  version?: string;
  enabled?: boolean;
  owner?: string;
  sections?: Array<{
    code: string;
    title: string;
    description?: string;
    clauses?: StandardEditorClause[];
  }>;
  appendices?: Array<{
    code: string;
    title: string;
    type?: 'annex' | 'appendix' | 'guide';
    description?: string;
    content?: string;
  }>;
};

const toStandardSummary = (standard: ApiStandardSummary): StandardSummary & {
  metrics?: ApiStandardSummary['metrics'];
} => ({
  ...standard,
  publishedAt: standard.publishedAt ? new Date(standard.publishedAt) : null,
  createdAt: standard.createdAt ? new Date(standard.createdAt) : undefined,
  updatedAt: standard.updatedAt ? new Date(standard.updatedAt) : undefined,
});

const toEvidence = (evidence: ApiEvidence): Evidence => ({
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

export async function listStandards() {
  const standards = await requestIsoApi<ApiStandardSummary[]>('/standards');
  return standards.map(toStandardSummary);
}

export async function fetchStandardStructure(standardId: string): Promise<StandardStructure> {
  const structure = await requestIsoApi<ApiStandardStructure>(`/standards/${standardId}/structure`);
  return {
    ...structure,
    standard: toStandardSummary(structure.standard),
  };
}

export async function createStandardApi(payload: StandardEditorPayload) {
  const structure = await requestIsoApi<ApiStandardStructure>('/standards', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return {
    ...structure,
    standard: toStandardSummary(structure.standard),
  };
}

export async function updateStandardApi(standardId: string, payload: StandardEditorPayload) {
  const structure = await requestIsoApi<ApiStandardStructure>(`/standards/${standardId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  return {
    ...structure,
    standard: toStandardSummary(structure.standard),
  };
}

export async function deleteStandardApi(standardId: string) {
  return requestIsoApi<{ success: boolean }>(`/standards/${standardId}`, {
    method: 'DELETE',
  });
}

export async function listRequirementEvidences(requirementId: string): Promise<Evidence[]> {
  const evidences = await requestIsoApi<ApiEvidence[]>(`/requirements/${requirementId}/evidences`);
  return evidences.map(toEvidence);
}

export async function listEvidences(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  auditId?: string;
  findingId?: string;
  status?: Evidence['status'];
}): Promise<PaginatedResult<Evidence>> {
  const query = new URLSearchParams();

  if (params?.page) {
    query.set('page', String(params.page));
  }

  if (params?.pageSize) {
    query.set('pageSize', String(params.pageSize));
  }

  if (params?.search?.trim()) {
    query.set('search', params.search.trim());
  }
  if (params?.auditId) {
    query.set('auditId', params.auditId);
  }
  if (params?.findingId) {
    query.set('findingId', params.findingId);
  }
  if (params?.status) {
    query.set('status', params.status);
  }

  const path = query.size > 0 ? `/evidences?${query.toString()}` : '/evidences';
  const result = await requestIsoApi<PaginatedResult<ApiEvidence>>(path);

  return {
    ...result,
    items: result.items.map(toEvidence),
  };
}

export async function createEvidenceApi(payload: {
  title: string;
  description?: string;
  standardId?: string | null;
  requirementId: string;
  clauseId?: string | null;
  status?: 'missing' | 'pending' | 'approved' | 'expired';
  objectiveType?: 'document' | 'record' | 'interview' | 'observation' | 'contract';
  owner?: string;
  sourceDocumentId?: string | null;
  documentIds?: string[];
  linkedAuditIds?: string[];
  findingId?: string | null;
  linkedTaskIds?: string[];
  fulfillmentSummary?: string;
  completionPercentage?: number;
  dueDate?: Date | null;
  collectedAt?: Date | null;
  notes?: string;
  changeSummary?: string;
}) {
  const evidence = await requestIsoApi<ApiEvidence>('/evidences', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      dueDate: payload.dueDate ? payload.dueDate.toISOString() : null,
      collectedAt: payload.collectedAt ? payload.collectedAt.toISOString() : null,
    }),
  });

  return toEvidence(evidence);
}

export async function updateEvidenceApi(
  evidenceId: string,
  payload: Partial<{
    title: string;
    description: string;
    standardId: string | null;
    requirementId: string;
    clauseId: string | null;
    status: Evidence['status'];
    objectiveType: Evidence['objectiveType'];
    owner: string;
    sourceDocumentId: string | null;
    documentIds: string[];
    linkedAuditIds: string[];
    findingId: string | null;
    linkedTaskIds: string[];
    fulfillmentSummary: string;
    completionPercentage: number;
    dueDate: Date | null;
    collectedAt: Date | null;
    notes: string;
    changeSummary: string;
  }>
) {
  const evidence = await requestIsoApi<ApiEvidence>(`/evidences/${evidenceId}`, {
    method: 'PUT',
    body: JSON.stringify({
      ...payload,
      dueDate: payload.dueDate !== undefined ? (payload.dueDate ? payload.dueDate.toISOString() : null) : undefined,
      collectedAt:
        payload.collectedAt !== undefined
          ? payload.collectedAt
            ? payload.collectedAt.toISOString()
            : null
          : undefined,
    }),
  });

  return toEvidence(evidence);
}

export async function deleteEvidenceApi(evidenceId: string) {
  return requestIsoApi<{ success: boolean }>(`/evidences/${evidenceId}`, {
    method: 'DELETE',
  });
}

export async function fetchAuditExecutionReport(auditId: string): Promise<AuditExecutionReport> {
  const report = await requestIsoApi<ApiAuditExecutionReport>(`/audits/${auditId}/execution-report`);
  return {
    evidences: report.evidences.map(toEvidence),
    tasks: report.tasks.map((task) => ({
      ...task,
      dueDate: new Date(task.dueDate),
    })),
  };
}
