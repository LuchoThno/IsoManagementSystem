import type { CommunicationProviderType } from '../domain.constants';

export type UpdateCommunicationSettingsDto = {
  enabled: boolean;
  providerType: CommunicationProviderType;
  providerName: string;
  senderName: string;
  senderEmail: string;
  replyTo: string;
  apiBaseUrl: string;
  apiKeyHint: string;
};

export type CreateEmailTemplateDto = {
  name: string;
  subject: string;
  content: string;
};

export type UpdateEmailTemplateDto = Partial<CreateEmailTemplateDto>;

export type SendBulkTaskReminderCampaignDto = {
  name: string;
  templateId: string;
  daysAhead: number;
  recipientIds: string[];
  recipientNames: string[];
  recipientEmails: string[];
};

export type StorePdfArtifactDto = {
  fileName: string;
  title: string;
  subject: string;
  sourceType: 'audit' | 'evidence';
  sourceId: string;
  checksum: string;
  generatedAtIso: string;
  generatedByName: string;
  generatedByEmail: string;
  pdfBase64: string;
  keywords: string[];
};

export type DeliverPdfArtifactDto = {
  fileName: string;
  title: string;
  subject: string;
  sourceType: 'audit' | 'evidence';
  sourceId: string;
  checksum: string;
  generatedAtIso: string;
  generatedByName: string;
  generatedByEmail: string;
  recipientEmails: string[];
  pdfBase64: string;
  fileUrl?: string;
  storageLabel?: string;
};
