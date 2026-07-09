import { BadRequestException, Injectable } from '@nestjs/common';
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
  ensureBoolean,
  ensureEmailString,
  ensureEnumValue,
  ensureIntegerInRange,
  ensureNonEmptyString,
  ensureObject,
  ensureOptionalEmailString,
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
    ensureObject(body, 'body');
    ensureBoolean(body.enabled, 'enabled');
    ensureEnumValue(body.providerType, 'providerType', COMMUNICATION_PROVIDER_VALUES);
    ensureNonEmptyString(body.providerName, 'providerName');
    ensureNonEmptyString(body.senderName, 'senderName');
    ensureEmailString(body.senderEmail, 'senderEmail');
    ensureOptionalEmailString(body.replyTo, 'replyTo');
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
    ensureObject(body, 'body');
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
    ensureNonEmptyString(id, 'id');
    ensureObject(body, 'body');
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
    ensureNonEmptyString(id, 'id');
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
    ensureObject(body, 'body');
    ensureNonEmptyString(body.name, 'name');
    ensureNonEmptyString(body.templateId, 'templateId');
    ensureIntegerInRange(body.daysAhead, 'daysAhead', { min: 0, max: 365 });
    ensureStringArray(body.recipientIds, 'recipientIds');
    ensureStringArray(body.recipientNames, 'recipientNames');
    ensureStringArray(body.recipientEmails, 'recipientEmails');
    this.ensureRecipientArraysAreAligned(body);

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

  private ensureRecipientArraysAreAligned(body: SendBulkTaskReminderCampaignDto) {
    if (body.recipientIds.length === 0) {
      throw new BadRequestException(
        'El campo "recipientIds" debe contener al menos un destinatario.'
      );
    }

    if (
      body.recipientIds.length !== body.recipientNames.length ||
      body.recipientIds.length !== body.recipientEmails.length
    ) {
      throw new BadRequestException(
        'Los arreglos "recipientIds", "recipientNames" y "recipientEmails" deben tener la misma cantidad de elementos.'
      );
    }

    body.recipientEmails.forEach((email, index) => {
      ensureEmailString(email, `recipientEmails[${index}]`);
    });
    body.recipientNames.forEach((name, index) => {
      ensureNonEmptyString(name, `recipientNames[${index}]`);
    });
    body.recipientIds.forEach((id, index) => {
      ensureNonEmptyString(id, `recipientIds[${index}]`);
    });
  }
}
