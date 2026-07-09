import type {
  AppendixType,
  ContractDocumentKind,
  ContractObligationStatus,
  ContractStatus,
  CorrectiveSourceType,
  CorrectiveStatus,
  EvidenceObjectiveType,
  EvidenceStatus,
  RequirementCriticality,
  RequirementStatus,
  StandardCategory,
  StandardStatus,
  TaskPriority,
} from '../domain.constants';

export type StandardRequirementPayload = {
  code: string;
  title: string;
  description?: string;
  intent?: string;
  criticality?: RequirementCriticality;
  status?: RequirementStatus;
};

export type StandardClausePayload = {
  code: string;
  title: string;
  description?: string;
  children?: StandardClausePayload[];
  requirements?: StandardRequirementPayload[];
};

export type StandardPayload = {
  code: string;
  title: string;
  description?: string;
  category?: StandardCategory;
  status?: StandardStatus;
  version?: string;
  enabled?: boolean;
  owner?: string;
  publishedAt?: string | null;
  sections?: Array<{
    code: string;
    title: string;
    description?: string;
    clauses?: StandardClausePayload[];
  }>;
  appendices?: Array<{
    code: string;
    title: string;
    type?: AppendixType;
    description?: string;
    content?: string;
  }>;
};

export type PaginationParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  auditId?: string;
  findingId?: string;
  status?: string;
};

export type CreateEvidenceDto = {
  title: string;
  description?: string;
  standardId?: string | null;
  requirementId: string;
  clauseId?: string | null;
  status?: EvidenceStatus;
  objectiveType?: EvidenceObjectiveType;
  owner?: string;
  sourceDocumentId?: string | null;
  documentIds?: string[];
  linkedAuditIds?: string[];
  findingId?: string | null;
  linkedTaskIds?: string[];
  fulfillmentSummary?: string;
  completionPercentage?: number;
  dueDate?: string | null;
  collectedAt?: string | null;
  notes?: string;
  changeSummary?: string;
};

export type UpdateEvidenceDto = {
  title?: string;
  description?: string;
  standardId?: string | null;
  requirementId?: string;
  clauseId?: string | null;
  status?: EvidenceStatus;
  objectiveType?: EvidenceObjectiveType;
  owner?: string;
  sourceDocumentId?: string | null;
  documentIds?: string[];
  linkedAuditIds?: string[];
  findingId?: string | null;
  linkedTaskIds?: string[];
  fulfillmentSummary?: string;
  completionPercentage?: number;
  dueDate?: string | null;
  collectedAt?: string | null;
  notes?: string;
  changeSummary?: string;
};

export type CreateContractDto = {
  title: string;
  counterparty: string;
  identifier: string;
  status?: ContractStatus;
  startDate?: string | null;
  endDate?: string | null;
  standardIds?: string[];
  owner?: string;
  summary?: string;
  obligations?: Array<{
    standardId?: string | null;
    title: string;
    description?: string;
    sourceClause?: string;
    dueDate?: string | null;
      status?: ContractObligationStatus;
      priority?: TaskPriority;
    owner?: string;
    evidenceIds?: string[];
  }>;
  documents?: Array<{
    title: string;
      kind?: ContractDocumentKind;
    fileName: string;
    mimeType: string;
    url: string;
    uploadedAt?: string;
  }>;
};

export type CreateCorrectiveActionDto = {
  title: string;
  description?: string;
  sourceType: CorrectiveSourceType;
  sourceId: string;
  standardId?: string | null;
  auditId?: string | null;
  assignedTo?: string;
  dueDate?: string | null;
  status?: CorrectiveStatus;
  priority?: TaskPriority;
  evidenceIds?: string[];
  verificationNotes?: string;
};
