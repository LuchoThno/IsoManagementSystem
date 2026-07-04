import { Injectable } from '@nestjs/common';
import { COMMUNICATION_PROVIDER_VALUES } from './domain.constants';
import type { ClerkSessionIdentity } from './clerk.types';
import type {
  CreateEmailTemplateDto,
  SendBulkTaskReminderCampaignDto,
  UpdateCommunicationSettingsDto,
  UpdateEmailTemplateDto,
} from './dto/communications.dto';
import { CommunicationsDomainService } from './communications-domain.service';
import { PlatformAuditService } from './platform-audit.service';
import {
  ensureEnumValue,
  ensureNonEmptyString,
  ensureOptionalString,
  ensureStringArray,
} from './request-validation';

@Injectable()
export class CommunicationsOperationsService {
  constructor(
    private readonly communicationsDomainService: CommunicationsDomainService,
    private readonly platformAuditService: PlatformAuditService
  ) {}

  getCommunicationCompatibility() {
    return this.communicationsDomainService.getCommunicationCompatibility();
  }

  async updateCommunicationSettings(
    clerkAuth: ClerkSessionIdentity | null,
    body: UpdateCommunicationSettingsDto
  ) {
    ensureEnumValue(body.providerType, 'providerType', COMMUNICATION_PROVIDER_VALUES);
    ensureNonEmptyString(body.providerName, 'providerName');
    ensureNonEmptyString(body.senderName, 'senderName');
    ensureNonEmptyString(body.senderEmail, 'senderEmail');
    ensureOptionalString(body.replyTo, 'replyTo');
    ensureOptionalString(body.apiBaseUrl, 'apiBaseUrl');
    ensureOptionalString(body.apiKeyHint, 'apiKeyHint');

    const result = await this.communicationsDomainService.updateCommunicationSettings(body);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'communications.settings.update',
      resourceType: 'communications-settings',
      status: 'success',
      metadata: {
        enabled: body.enabled,
        providerType: body.providerType,
        senderEmail: body.senderEmail,
      },
    });
    return result;
  }

  async createEmailTemplate(clerkAuth: ClerkSessionIdentity | null, body: CreateEmailTemplateDto) {
    ensureNonEmptyString(body.name, 'name');
    ensureNonEmptyString(body.subject, 'subject');
    ensureNonEmptyString(body.content, 'content');

    const template = await this.communicationsDomainService.createEmailTemplate(body);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'communications.template.create',
      resourceType: 'email-template',
      resourceId: template?.id ?? null,
      status: 'success',
      metadata: {
        name: body.name,
      },
    });
    return template;
  }

  async updateEmailTemplate(
    id: string,
    clerkAuth: ClerkSessionIdentity | null,
    body: UpdateEmailTemplateDto
  ) {
    ensureOptionalString(body.name, 'name');
    ensureOptionalString(body.subject, 'subject');
    ensureOptionalString(body.content, 'content');

    const template = await this.communicationsDomainService.updateEmailTemplate(id, body);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'communications.template.update',
      resourceType: 'email-template',
      resourceId: id,
      status: 'success',
      metadata: {
        name: body.name ?? null,
      },
    });
    return template;
  }

  async deleteEmailTemplate(id: string, clerkAuth: ClerkSessionIdentity | null) {
    const result = await this.communicationsDomainService.deleteEmailTemplate(id);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'communications.template.delete',
      resourceType: 'email-template',
      resourceId: id,
      status: 'success',
    });
    return result;
  }

  async sendBulkTaskReminderCampaign(
    clerkAuth: ClerkSessionIdentity | null,
    body: SendBulkTaskReminderCampaignDto
  ) {
    ensureNonEmptyString(body.name, 'name');
    ensureNonEmptyString(body.templateId, 'templateId');
    ensureStringArray(body.recipientIds, 'recipientIds');
    ensureStringArray(body.recipientNames, 'recipientNames');
    ensureStringArray(body.recipientEmails, 'recipientEmails');

    const campaign = await this.communicationsDomainService.sendBulkTaskReminderCampaign(body);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'communications.campaign.send',
      resourceType: 'email-campaign',
      resourceId: campaign?.id ?? null,
      status: 'success',
      metadata: {
        name: body.name,
        recipientCount: body.recipientIds.length,
        daysAhead: body.daysAhead,
      },
    });
    return campaign;
  }
}
