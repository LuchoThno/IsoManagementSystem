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
