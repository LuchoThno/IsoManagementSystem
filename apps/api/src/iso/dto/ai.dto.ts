import type { AuditType, AuditStatus } from '../domain.constants';

export type AIAccessContextDto = {
  tenantId: string;
};

export type AnalyzeDocumentInputDto = {
  documentId: string;
  documentVersionId?: string;
  focus?: string;
};

export type AIDocumentSource = {
  type: 'document' | 'evidence' | 'audit' | 'policy';
  id: string;
  excerpt?: string;
};

export type AnalyzeDocumentResultDto = {
  id: string;
  status: 'success' | 'failure';
  model: 'stub';
  tenantId: string;
  documentId: string;
  documentVersionId?: string;
  focus?: string;
  sources: AIDocumentSource[];
  extractedFacts: Array<{ label: string; value: string }>;
  generatedProcedures: string[];
  auditSummary: {
    auditType?: AuditType | null;
    auditStatus?: AuditStatus | null;
    summary: string;
    keyFindings: string[];
  };
  proposedCorrectiveActions: string[];
  recommendations: string[];
};

export type GenerateProcedureInputDto = {
  topic: string;
  documentId?: string;
};

export type GenerateProcedureResultDto = {
  id: string;
  status: 'success' | 'failure';
  model: 'stub';
  tenantId: string;
  topic: string;
  steps: Array<{ step: number; instruction: string }>;
};

export type SummarizeAuditInputDto = {
  auditId: string;
};

export type SummarizeAuditResultDto = {
  id: string;
  status: 'success' | 'failure';
  model: 'stub';
  tenantId: string;
  auditId: string;
  summary: string;
  keyFindings: string[];
};

export type ProposeCorrectiveActionsInputDto = {
  auditId?: string;
  riskContext?: string;
};

export type ProposeCorrectiveActionsResultDto = {
  id: string;
  status: 'success' | 'failure';
  model: 'stub';
  tenantId: string;
  auditId?: string;
  actions: string[];
};

export type AssistChatThreadInputDto = {
  threadId: string;
  goal?: string;
};

export type AssistChatThreadResultDto = {
  id: string;
  status: 'success' | 'failure';
  model: 'stub';
  tenantId: string;
  threadId: string;
  participants: string[];
  summary: string;
  suggestedReplies: string[];
  actionItems: string[];
};
