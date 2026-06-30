import type {
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

export async function createStandardApi(payload: {
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
    clauses?: Array<{
      code: string;
      title: string;
      description?: string;
      requirements?: Array<{
        code: string;
        title: string;
        description?: string;
        intent?: string;
        criticality?: 'low' | 'medium' | 'high';
        status?: 'draft' | 'active' | 'obsolete';
      }>;
    }>;
  }>;
  appendices?: Array<{
    code: string;
    title: string;
    type?: 'annex' | 'appendix' | 'guide';
    description?: string;
    content?: string;
  }>;
}) {
  const structure = await requestIsoApi<ApiStandardStructure>('/standards', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return {
    ...structure,
    standard: toStandardSummary(structure.standard),
  };
}

export async function listRequirementEvidences(requirementId: string): Promise<Evidence[]> {
  const evidences = await requestIsoApi<ApiEvidence[]>(`/requirements/${requirementId}/evidences`);
  return evidences.map(toEvidence);
}

export async function listEvidences(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
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
  dueDate?: Date | null;
  collectedAt?: Date | null;
  notes?: string;
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
