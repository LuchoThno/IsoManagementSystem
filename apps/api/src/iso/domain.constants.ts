export const DOCUMENT_TYPE_VALUES = ['manual', 'procedure', 'record'] as const;
export const DOCUMENT_FORMAT_VALUES = [
  'PDF',
  'DOCX',
  'XLSX',
  'PPTX',
  'TXT',
  'PNG',
  'JPG',
  'WEBP',
  'GIF',
] as const;
export const DOCUMENT_STATUS_VALUES = ['draft', 'active', 'archived'] as const;

export const TASK_STATUS_VALUES = ['pending', 'in-progress', 'completed', 'overdue'] as const;
export const TASK_PRIORITY_VALUES = ['low', 'medium', 'high'] as const;

export const AUDIT_TYPE_VALUES = ['internal', 'external'] as const;
export const AUDIT_STATUS_VALUES = ['planned', 'in-progress', 'completed'] as const;
export const FINDING_TYPE_VALUES = ['nonconformity', 'observation', 'opportunity'] as const;
export const FINDING_STATUS_VALUES = ['open', 'in-progress', 'closed'] as const;

export const COMMUNICATION_PROVIDER_VALUES = ['resend', 'gmail', 'custom'] as const;

export const STANDARD_CATEGORY_VALUES = ['standard', 'framework', 'regulation', 'contractual'] as const;
export const STANDARD_STATUS_VALUES = ['draft', 'active', 'archived'] as const;
export const APPENDIX_TYPE_VALUES = ['annex', 'appendix', 'guide'] as const;
export const REQUIREMENT_CRITICALITY_VALUES = ['low', 'medium', 'high'] as const;
export const REQUIREMENT_STATUS_VALUES = ['draft', 'active', 'obsolete'] as const;

export const EVIDENCE_STATUS_VALUES = ['missing', 'pending', 'approved', 'expired'] as const;
export const EVIDENCE_OBJECTIVE_TYPE_VALUES = [
  'document',
  'record',
  'interview',
  'observation',
  'contract',
] as const;

export const CONTRACT_STATUS_VALUES = ['draft', 'active', 'expired', 'closed'] as const;
export const CONTRACT_OBLIGATION_STATUS_VALUES = ['open', 'in-progress', 'fulfilled', 'overdue'] as const;
export const CONTRACT_DOCUMENT_KIND_VALUES = ['contract', 'annex', 'policy', 'evidence'] as const;

export const CORRECTIVE_SOURCE_TYPE_VALUES = [
  'finding',
  'audit',
  'contract',
  'requirement',
  'evidence',
] as const;
export const CORRECTIVE_STATUS_VALUES = ['open', 'in-progress', 'verified', 'closed'] as const;

export type DocumentType = (typeof DOCUMENT_TYPE_VALUES)[number];
export type DocumentFormat = (typeof DOCUMENT_FORMAT_VALUES)[number];
export type DocumentStatus = (typeof DOCUMENT_STATUS_VALUES)[number];

export type TaskStatus = (typeof TASK_STATUS_VALUES)[number];
export type TaskPriority = (typeof TASK_PRIORITY_VALUES)[number];

export type AuditType = (typeof AUDIT_TYPE_VALUES)[number];
export type AuditStatus = (typeof AUDIT_STATUS_VALUES)[number];
export type FindingType = (typeof FINDING_TYPE_VALUES)[number];
export type FindingStatus = (typeof FINDING_STATUS_VALUES)[number];

export type CommunicationProviderType = (typeof COMMUNICATION_PROVIDER_VALUES)[number];

export type StandardCategory = (typeof STANDARD_CATEGORY_VALUES)[number];
export type StandardStatus = (typeof STANDARD_STATUS_VALUES)[number];
export type AppendixType = (typeof APPENDIX_TYPE_VALUES)[number];
export type RequirementCriticality = (typeof REQUIREMENT_CRITICALITY_VALUES)[number];
export type RequirementStatus = (typeof REQUIREMENT_STATUS_VALUES)[number];

export type EvidenceStatus = (typeof EVIDENCE_STATUS_VALUES)[number];
export type EvidenceObjectiveType = (typeof EVIDENCE_OBJECTIVE_TYPE_VALUES)[number];

export type ContractStatus = (typeof CONTRACT_STATUS_VALUES)[number];
export type ContractObligationStatus = (typeof CONTRACT_OBLIGATION_STATUS_VALUES)[number];
export type ContractDocumentKind = (typeof CONTRACT_DOCUMENT_KIND_VALUES)[number];

export type CorrectiveSourceType = (typeof CORRECTIVE_SOURCE_TYPE_VALUES)[number];
export type CorrectiveStatus = (typeof CORRECTIVE_STATUS_VALUES)[number];
