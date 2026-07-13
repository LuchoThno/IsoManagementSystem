import { requestIsoApi } from './isoApiClient';

export type AIResultStatus = 'success' | 'failure';

export type AuditSummaryResult = {
  id: string;
  status: AIResultStatus;
  model: 'stub';
  tenantId: string;
  auditId: string;
  summary: string;
  keyFindings: string[];
};

export type CorrectiveActionsResult = {
  id: string;
  status: AIResultStatus;
  model: 'stub';
  tenantId: string;
  auditId?: string;
  actions: string[];
};

export type ChatAssistResult = {
  id: string;
  status: AIResultStatus;
  model: 'stub';
  tenantId: string;
  threadId: string;
  participants: string[];
  summary: string;
  suggestedReplies: string[];
  actionItems: string[];
};

export type CommunicationCampaignDraftResult = {
  id: string;
  status: AIResultStatus;
  model: 'stub';
  tenantId: string;
  recommendedTemplateName: string;
  recommendedCampaignName: string;
  subject: string;
  html: string;
  rationale: string[];
  bestPracticesChecklist: string[];
};

export async function summarizeAuditWithAI(auditId: string): Promise<AuditSummaryResult> {
  return requestIsoApi<AuditSummaryResult>('/ai/summarize-audit', {
    method: 'POST',
    body: JSON.stringify({ auditId }),
  });
}

export async function proposeCorrectiveActionsWithAI(input: {
  auditId?: string;
  riskContext?: string;
}): Promise<CorrectiveActionsResult> {
  return requestIsoApi<CorrectiveActionsResult>('/ai/propose-corrective-actions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function assistChatThreadWithAI(input: {
  threadId: string;
  goal?: string;
}): Promise<ChatAssistResult> {
  return requestIsoApi<ChatAssistResult>('/ai/chat-assist', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function draftCommunicationCampaignWithAI(input: {
  companyName: string;
  senderName: string;
  deliveryMode: 'personal' | 'group' | 'massive';
  audienceLabel: string;
  campaignGoal: string;
  daysAhead: number;
  providerType: 'resend' | 'gmail' | 'custom';
  tone?: string;
  currentTemplateName?: string;
}): Promise<CommunicationCampaignDraftResult> {
  return requestIsoApi<CommunicationCampaignDraftResult>('/ai/draft-communication-campaign', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
