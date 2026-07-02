import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { COMMUNICATION_PROVIDER_VALUES } from './domain.constants';
import { ClerkAuth } from './clerk-auth.decorator';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { IsoService } from './iso.service';
import { PlatformAuditService } from './platform-audit.service';
import type {
  CreateEmailTemplateDto,
  SendBulkTaskReminderCampaignDto,
  UpdateCommunicationSettingsDto,
  UpdateEmailTemplateDto,
} from './dto/communications.dto';
import {
  ensureEnumValue,
  ensureNonEmptyString,
  ensureOptionalString,
  ensureStringArray,
} from './request-validation';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import type { ClerkSessionIdentity } from './clerk.types';

@Controller('iso')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class CommunicationsController {
  constructor(
    private readonly isoService: IsoService,
    private readonly platformAuditService: PlatformAuditService
  ) {}

  @Get('communications/compatibility')
  getCommunicationCompatibility() {
    return this.isoService.getCommunicationCompatibility();
  }

  @Put('communications/settings')
  @Roles('admin')
  async updateCommunicationSettings(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body()
    body: UpdateCommunicationSettingsDto
  ) {
    ensureEnumValue(body.providerType, 'providerType', COMMUNICATION_PROVIDER_VALUES);
    ensureNonEmptyString(body.providerName, 'providerName');
    ensureNonEmptyString(body.senderName, 'senderName');
    ensureNonEmptyString(body.senderEmail, 'senderEmail');
    ensureOptionalString(body.replyTo, 'replyTo');
    ensureOptionalString(body.apiBaseUrl, 'apiBaseUrl');
    ensureOptionalString(body.apiKeyHint, 'apiKeyHint');

    const result = await this.isoService.updateCommunicationSettings(body);
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

  @Post('communications/templates')
  @Roles('admin', 'manager')
  async createEmailTemplate(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body()
    body: CreateEmailTemplateDto
  ) {
    ensureNonEmptyString(body.name, 'name');
    ensureNonEmptyString(body.subject, 'subject');
    ensureNonEmptyString(body.content, 'content');

    const template = await this.isoService.createEmailTemplate(body);
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

  @Patch('communications/templates/:id')
  @Roles('admin', 'manager')
  async updateEmailTemplate(
    @Param('id') id: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body()
    body: UpdateEmailTemplateDto
  ) {
    ensureOptionalString(body.name, 'name');
    ensureOptionalString(body.subject, 'subject');
    ensureOptionalString(body.content, 'content');

    const template = await this.isoService.updateEmailTemplate(id, body);
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

  @Patch('communications/templates/:id/delete')
  @Roles('admin')
  async deleteEmailTemplate(
    @Param('id') id: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null
  ) {
    const result = await this.isoService.deleteEmailTemplate(id);
    await this.platformAuditService.captureFromSession(clerkAuth, {
      action: 'communications.template.delete',
      resourceType: 'email-template',
      resourceId: id,
      status: 'success',
    });
    return result;
  }

  @Post('communications/campaigns/send')
  @Roles('admin', 'manager')
  async sendBulkTaskReminderCampaign(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body()
    body: SendBulkTaskReminderCampaignDto
  ) {
    ensureNonEmptyString(body.name, 'name');
    ensureNonEmptyString(body.templateId, 'templateId');
    ensureStringArray(body.recipientIds, 'recipientIds');
    ensureStringArray(body.recipientNames, 'recipientNames');
    ensureStringArray(body.recipientEmails, 'recipientEmails');

    const campaign = await this.isoService.sendBulkTaskReminderCampaign(body);
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
