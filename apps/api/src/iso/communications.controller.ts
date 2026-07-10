import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ClerkAuth } from './clerk-auth.decorator';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { CommunicationsOperationsService } from './communications-operations.service';
import type {
  CreateEmailTemplateDto,
  DeliverPdfArtifactDto,
  SendBulkTaskReminderCampaignDto,
  StorePdfArtifactDto,
  UpdateCommunicationSettingsDto,
  UpdateEmailTemplateDto,
} from './dto/communications.dto';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import type { ClerkSessionIdentity } from './clerk.types';

@Controller('iso')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class CommunicationsController {
  constructor(
    private readonly communicationsOperationsService: CommunicationsOperationsService
  ) {}

  @Get('communications/compatibility')
  getCommunicationCompatibility() {
    return this.communicationsOperationsService.getCommunicationCompatibility();
  }

  @Put('communications/settings')
  @Roles('admin')
  async updateCommunicationSettings(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body()
    body: UpdateCommunicationSettingsDto
  ) {
    return this.communicationsOperationsService.updateCommunicationSettings(clerkAuth, body);
  }

  @Post('communications/templates')
  @Roles('admin', 'manager')
  async createEmailTemplate(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body()
    body: CreateEmailTemplateDto
  ) {
    return this.communicationsOperationsService.createEmailTemplate(clerkAuth, body);
  }

  @Patch('communications/templates/:id')
  @Roles('admin', 'manager')
  async updateEmailTemplate(
    @Param('id') id: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body()
    body: UpdateEmailTemplateDto
  ) {
    return this.communicationsOperationsService.updateEmailTemplate(id, clerkAuth, body);
  }

  @Patch('communications/templates/:id/delete')
  @Roles('admin')
  async deleteEmailTemplate(
    @Param('id') id: string,
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null
  ) {
    return this.communicationsOperationsService.deleteEmailTemplate(id, clerkAuth);
  }

  @Post('communications/campaigns/send')
  @Roles('admin', 'manager')
  async sendBulkTaskReminderCampaign(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body()
    body: SendBulkTaskReminderCampaignDto
  ) {
    return this.communicationsOperationsService.sendBulkTaskReminderCampaign(clerkAuth, body);
  }

  @Post('communications/pdf-artifacts/store')
  async storePdfArtifact(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body()
    body: StorePdfArtifactDto
  ) {
    return this.communicationsOperationsService.storePdfArtifact(clerkAuth, body);
  }

  @Post('communications/pdf-artifacts/deliver')
  async deliverPdfArtifact(
    @ClerkAuth() clerkAuth: ClerkSessionIdentity | null,
    @Body()
    body: DeliverPdfArtifactDto
  ) {
    return this.communicationsOperationsService.deliverPdfArtifact(clerkAuth, body);
  }
}
